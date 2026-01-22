// 定义固定UUID常量
const TARGET_SERVICE_UUID = "55535343-FE7D-4AE5-8FA9-9FAFD205E455";
const CHAR_UUID_WRITE = "49535343-8841-43F4-A8D4-ECBE34729BB3";
const CHAR_UUID_READ_NOTIFY = "49535343-1E4D-4BD9-BA61-23C647249616";

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
        const deviceId = options.deviceId
        const name = decodeURIComponent(options.name || '')
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
        wx.onBLEConnectionStateChange((res) => {
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
        })
    },

    closeBLEConnection() {
        wx.closeBLEConnection({
            deviceId: this.data.deviceId
        })
        this.setData({
            connected: false
        })
    },

    // 2. 获取服务
    getBLEDeviceServices(deviceId) {
        wx.getBLEDeviceServices({
            deviceId,
            success: (res) => {
                // 寻找目标服务
                const targetService = res.services.find(s => s.uuid.toUpperCase().includes(TARGET_SERVICE_UUID))
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
                const writeChar = res.characteristics.find(c => c.uuid.toUpperCase().includes(CHAR_UUID_WRITE))
                if (writeChar) {
                    this._writeCharId = writeChar.uuid
                    this.setData({
                        writeReady: true
                    })
                    this.addLog(`写通道就绪: ${CHAR_UUID_WRITE}`, 'info')
                }

                // 寻找读/通知特征值
                const notifyChar = res.characteristics.find(c => c.uuid.toUpperCase().includes(CHAR_UUID_READ_NOTIFY))
                if (notifyChar) {
                    this._notifyCharId = notifyChar.uuid
                    this.setData({
                        notifyReady: true
                    })
                    // 自动开启通知
                    this.notifyBLECharacteristicValueChange(true)
                }

                if (!writeChar && !notifyChar) {
                    this.addLog('未找到指定的特征值 ' + CHAR_UUID_READ_NOTIFY, 'info')
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
                this.addLog(`通知已${enable ? '开启' : '关闭'}`, 'info')
                if (enable) {
                    this.initValueChangeListener()
                }
            },
            fail: (res) => {
                this.addLog(`Notify操作失败: ${res.errMsg}`, 'info')
            }
        })
    },

    initValueChangeListener() {
        // 避免重复监听
        if (this._isListening) return
        this._isListening = true

        wx.onBLECharacteristicValueChange((res) => {
            // 过滤特征值，只处理
            if (res.characteristicId.toUpperCase().includes(CHAR_UUID_READ_NOTIFY)) {
                const hex = this.ab2hex(res.value)
                const str = this.hexCharCodeToStr(res.value)
                this.addLog(`收到数据: \r\nHex格式=${hex}\r\nString格式=${str}`, 'recv')
            }
        })
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
        wx.writeBLECharacteristicValue({
            deviceId: this.data.deviceId,
            serviceId: this._serviceId,
            characteristicId: this._writeCharId,
            value: buffer,
            success: () => {
                this.addLog(`发送成功: ${logMsg}`, 'send')
                wx.showToast({
                    title: '发送成功',
                    icon: 'success',
                    duration: 1000
                })
            },
            fail: (res) => {
                this.addLog(`发送失败: ${res.errMsg}`, 'info')
                wx.showToast({
                    title: '发送失败',
                    icon: 'none'
                })
            }
        })
    },

    // 工具函数
    addLog(content, type) {
        const time = new Date().toTimeString().substring(0, 8)
        const log = {
            time,
            content,
            type
        }
        const logs = this.data.logs
        logs.push(log)
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
        let hexArr = Array.prototype.map.call(
            new Uint8Array(buffer),
            function (bit) {
                return ('00' + bit.toString(16)).slice(-2)
            }
        )
        return hexArr.join(' ').toUpperCase()
    },

    // 16进制字符串转ArrayBuffer
    hexStringToArrayBuffer(str) {
        if (!str) return new ArrayBuffer(0)
        var buffer = new ArrayBuffer(str.length / 2)
        let dataView = new DataView(buffer)
        let ind = 0
        for (var i = 0, len = str.length; i < len; i += 2) {
            let code = parseInt(str.substr(i, 2), 16)
            dataView.setUint8(ind, code)
            ind++
        }
        return buffer
    },

    // 字符串转ArrayBuffer
    stringToBuffer(str) {
        let val = str
        let length = val.length
        let buffer = new ArrayBuffer(length)
        let uint8 = new Uint8Array(buffer)
        for (let i = 0; i < length; i++) {
            uint8[i] = val.charCodeAt(i)
        }
        return buffer
    },

    // HEX转字符串
    hexCharCodeToStr(hexCharCodeStr) {
        var arr = Array.prototype.map.call(new Uint8Array(hexCharCodeStr), x => x)
        var str = ''
        for (var i = 0; i < arr.length; i++) {
          str += String.fromCharCode(arr[i])
        }
        return str
    }
})