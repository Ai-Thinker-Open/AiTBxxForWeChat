// 定义固定UUID常量
const TARGET_SERVICE_UUID = "55535343-FE7D-4AE5-8FA9-9FAFD205E455";
const CHAR_UUID_WRITE = "49535343-8841-43F4-A8D4-ECBE34729BB3";
const CHAR_UUID_READ_NOTIFY = "49535343-1E4D-4BD9-BA61-23C647249616";
const BLE_WRITE_CHUNK_SIZE = 20;
const MAX_LOG_ENTRIES = 200;
const BleUtils = require('../../utils/ble-utils');

Page({
    data: {
        deviceId: '',
        name: '',
        connected: false,
        // 状态标志
        serviceFound: false,
        writeReady: false,
        notifyReady: false,

        inputText: '',
        isHex: false,

        logs: [],
        scrollTop: 0
    },

    onLoad(options) {
        const deviceId = BleUtils.safeDecodeURIComponent(options.deviceId)
        const name = BleUtils.safeDecodeURIComponent(options.name)
        this.setData({
            deviceId,
            name
        })
        this.createBLEConnection(deviceId)

        // 提示UUID
        wx.showModal({
            title: '通讯要求',
            showCancel: false,
            content: '主服务：55535343-FE7D-4AE5-8FA9-9FAFD205E455\r\nWrite特征：49535343-8841-43F4-A8D4-ECBE34729BB3\r\nRead/Notify服务：49535343-1E4D-4BD9-BA61-23C647249616',
        })
    },

    onUnload() {
        if (this._connectionStateHandler && wx.offBLEConnectionStateChange) {
            wx.offBLEConnectionStateChange(this._connectionStateHandler)
            this._connectionStateHandler = null
        }
        if (this._valueChangeHandler && wx.offBLECharacteristicValueChange) {
            wx.offBLECharacteristicValueChange(this._valueChangeHandler)
            this._valueChangeHandler = null
            this._isListening = false
        }
        this.closeBLEConnection()
    },

    // 1. 连接设备
    createBLEConnection(deviceId) {
        this.addLog(`开始连接: ${deviceId}`, 'info')
        wx.createBLEConnection({
            deviceId,
            success: () => {

                // 更新MTU
                wx.setBLEMTU({
                  deviceId: deviceId,
                  mtu: 240,
                  fail: (res) => {
                    this.addLog(`MTU设置未生效，将使用20字节分包: ${res.errMsg}`, 'info')
                  }
                })

                this.setData({
                    connected: true
                })
                this.addLog('连接成功，正在初始化服务...', 'info')
                this.getBLEDeviceServices(deviceId)
            },
            fail: (res) => {
                this.addLog(`连接失败: ${res.errMsg}`, 'info')
                wx.showToast({
                    title: '连接失败',
                    icon: 'none'
                })
            }
        })
        // 监听连接状态
        this._connectionStateHandler = (res) => {
            if (res.deviceId && res.deviceId !== this.data.deviceId) return
            this.setData({
                connected: res.connected
            })
            if (!res.connected) {
                this.addLog('连接已断开', 'info')
                this.setData({
                    serviceFound: false,
                    writeReady: false,
                    notifyReady: false
                })
                wx.showToast({
                    title: '连接已断开',
                    icon: 'none'
                })
            }
        }
        wx.onBLEConnectionStateChange(this._connectionStateHandler)
    },

    closeBLEConnection() {
        if (!this.data.deviceId) return
        wx.closeBLEConnection({
            deviceId: this.data.deviceId
        })
        this.setData({
            connected: false,
            serviceFound: false,
            writeReady: false,
            notifyReady: false
        })
        this._serviceId = null
        this._writeCharId = null
        this._notifyCharId = null
    },

    // 2. 获取服务
    getBLEDeviceServices(deviceId) {
        wx.getBLEDeviceServices({
            deviceId,
            success: (res) => {
                // 寻找目标服务
                const targetService = res.services.find(s => BleUtils.uuidMatches(s.uuid, TARGET_SERVICE_UUID))
                if (targetService) {
                    this.setData({
                        serviceFound: true
                    })
                    this.addLog(`找到目标服务: ${TARGET_SERVICE_UUID}`, 'info')
                    this.getBLEDeviceCharacteristics(deviceId, targetService.uuid)
                } else {
                    this.addLog(`未找到目标服务 ${TARGET_SERVICE_UUID}`, 'info')
                    wx.showToast({
                        title: '未找到目标服务',
                        icon: 'none'
                    })
                }
            },
            fail: (res) => {
                this.addLog(`获取服务失败: ${res.errMsg}`, 'info')
            }
        })
    },

    // 3. 获取特征值
    getBLEDeviceCharacteristics(deviceId, serviceId) {
        this._serviceId = serviceId // 保存实际的 Service UUID (可能是长 UUID)

        wx.getBLEDeviceCharacteristics({
            deviceId,
            serviceId,
            success: (res) => {
                // 寻找写特征值 
                const writeChar = res.characteristics.find(c =>
                    BleUtils.uuidMatches(c.uuid, CHAR_UUID_WRITE) &&
                    c.properties && (c.properties.write || c.properties.writeNoResponse)
                )
                if (writeChar) {
                    this._writeCharId = writeChar.uuid
                    this.setData({
                        writeReady: true
                    })
                    this.addLog(`写通道就绪: ${CHAR_UUID_WRITE}`, 'info')
                }

                // 寻找读/通知特征值
                const notifyChar = res.characteristics.find(c =>
                    BleUtils.uuidMatches(c.uuid, CHAR_UUID_READ_NOTIFY) &&
                    c.properties && (c.properties.notify || c.properties.indicate)
                )
                if (notifyChar) {
                    this._notifyCharId = notifyChar.uuid
                    // 自动开启通知
                    this.notifyBLECharacteristicValueChange(true)
                }

                if (!writeChar || !notifyChar) {
                    this.addLog('缺少具备正确属性的写入或通知特征值', 'info')
                    wx.showToast({
                        title: '特征值不匹配',
                        icon: 'none'
                    })
                }
            },
            fail: (res) => {
                this.addLog(`获取特征值失败: ${res.errMsg}`, 'info')
            }
        })
    },


    // 4. 开启/关闭通知 (使用固定特征值)
    notifyBLECharacteristicValueChange(enable) {
        if (!this._notifyCharId) return

        wx.notifyBLECharacteristicValueChange({
            state: enable,
            deviceId: this.data.deviceId,
            serviceId: this._serviceId,
            characteristicId: this._notifyCharId,
            success: (res) => {
                this.setData({ notifyReady: enable })
                this.addLog(`通知已${enable ? '开启' : '关闭'}`, 'info')
                if (enable) {
                    this.initValueChangeListener()
                }
            },
            fail: (res) => {
                this.setData({ notifyReady: false })
                this.addLog(`Notify操作失败: ${res.errMsg}`, 'info')
            }
        })
    },

    initValueChangeListener() {
        // 避免重复监听
        if (this._isListening) return
        this._isListening = true

        this._valueChangeHandler = (res) => {
            // 过滤特征值，只处理
            if (res.deviceId === this.data.deviceId &&
                BleUtils.uuidMatches(res.characteristicId, CHAR_UUID_READ_NOTIFY)) {
                const hex = this.ab2hex(res.value)
                const str = this.hexCharCodeToStr(res.value)
                this.addLog(`收到数据: \r\nHex格式=${hex}\r\nString格式=${str}`, 'recv')
            }
        }
        wx.onBLECharacteristicValueChange(this._valueChangeHandler)
    },

    // 5. 写入数据 (使用固定特征值)
    onInput(e) {
        this.setData({
            inputText: e.detail.value
        })
    },

    onTypeChange(e) {
        this.setData({
            isHex: !this.data.isHex
        })
    },

    writeBLECharacteristicValue() {
        if (!this.data.connected || !this._writeCharId) {
            wx.showToast({
                title: '写通道未就绪',
                icon: 'none'
            })
            return
        }

        const text = this.data.inputText
        if (!text) {
            wx.showToast({
                title: '请输入内容',
                icon: 'none'
            })
            return
        }

        let buffer
        let logMsg = `发送: ${text}`
        if (this.data.isHex) {
            // 去除所有空格
            const cleanText = text.replace(/\s+/g, '')

            // 校验空
            if (cleanText.length === 0) {
                wx.showToast({
                    title: '请输入HEX数据',
                    icon: 'none'
                })
                return
            }

            // 校验HEX格式 (0-9, A-F, a-f)
            if (!/^[0-9A-Fa-f]+$/.test(cleanText)) {
                wx.showModal({
                    title: '格式错误',
                    content: 'HEX输入包含非法字符，请仅输入0-9, A-F',
                    showCancel: false
                })
                return
            }

            // 校验长度 (必须是偶数)
            if (cleanText.length % 2 !== 0) {
                wx.showModal({
                    title: '格式错误',
                    content: 'HEX数据长度必须为偶数，例如: AA BB',
                    showCancel: false
                })
                return
            }

            buffer = this.hexStringToArrayBuffer(cleanText)
            logMsg = `发送HEX: ${cleanText}`
        } else {
            buffer = this.stringToBuffer(text)
        }

        this._sendBuffer(buffer, logMsg)
    },

    // 7. 发送快捷指令
    sendQuickCommand(e) {
        if (!this.data.connected || !this._writeCharId) {
            wx.showToast({
                title: '写通道未就绪',
                icon: 'none'
            })
            return
        }
        const hex = e.currentTarget.dataset.hex
        const buffer = this.hexStringToArrayBuffer(hex)
        this._sendBuffer(buffer, `快捷指令: ${hex}`)
    },

    // 统一发送 Buffer
    _sendBuffer(buffer, logMsg) {
        const bytes = new Uint8Array(buffer)
        const totalChunks = Math.ceil(bytes.length / BLE_WRITE_CHUNK_SIZE)
        let offset = 0

        const writeNextChunk = () => {
            const end = Math.min(offset + BLE_WRITE_CHUNK_SIZE, bytes.length)
            const chunkBytes = new Uint8Array(end - offset)
            chunkBytes.set(bytes.subarray(offset, end))

            wx.writeBLECharacteristicValue({
                deviceId: this.data.deviceId,
                serviceId: this._serviceId,
                characteristicId: this._writeCharId,
                value: chunkBytes.buffer,
                success: () => {
                    offset = end
                    if (offset < bytes.length) {
                        setTimeout(writeNextChunk, 20)
                        return
                    }
                    const chunkInfo = totalChunks > 1 ? `，共${totalChunks}包` : ''
                    this.addLog(`发送成功${chunkInfo}: ${logMsg}`, 'send')
                    wx.showToast({
                        title: '发送成功',
                        icon: 'success',
                        duration: 1000
                    })
                },
                fail: (res) => {
                    const failedChunk = Math.floor(offset / BLE_WRITE_CHUNK_SIZE) + 1
                    this.addLog(`发送失败（第${failedChunk}/${totalChunks}包）: ${res.errMsg}`, 'info')
                    wx.showToast({
                        title: '发送失败',
                        icon: 'none'
                    })
                }
            })
        }

        writeNextChunk()
    },

    // 工具函数
    addLog(content, type) {
        const time = new Date().toTimeString().substring(0, 8)
        const log = {
            time,
            content,
            type
        }
        const logs = this.data.logs.concat(log).slice(-MAX_LOG_ENTRIES)
        this.setData({
            logs,
            scrollTop: logs.length * 100
        })
    },

    clearLog() {
        this.setData({
            logs: []
        })
    },

    // ArrayBuffer转16进制字符串
    ab2hex(buffer) {
        return BleUtils.bytesToHex(new Uint8Array(buffer))
    },

    // 16进制字符串转ArrayBuffer
    hexStringToArrayBuffer(str) {
        return new Uint8Array(BleUtils.hexToBytes(str)).buffer
    },

    // 字符串转ArrayBuffer
    stringToBuffer(str) {
        return new Uint8Array(BleUtils.stringToUtf8Bytes(str)).buffer
    },

    // HEX转字符串
    hexCharCodeToStr(hexCharCodeStr) {
        return BleUtils.bytesToUtf8String(new Uint8Array(hexCharCodeStr))
    }
})
