# 安信可模组微信小程序蓝牙调试助手

这是一个基于原生微信小程序开发的蓝牙调试工具，专为蓝牙低功耗 (BLE) 设备调试设计。项目不依赖第三方框架，代码简洁易维护。

## ✨ 主要功能

*   **🔍 蓝牙搜索与过滤**：支持实时搜索周边 BLE 设备，并可通过名称关键字实时过滤列表。
*   **🔗 自动连接与配置**：
    *   连接后自动寻找目标服务 UUID (`0xFFFF`)。
    *   自动识别并配置写特征值 (`0xFF01`) 和通知特征值 (`0xFF02`)。
    *   自动开启 Notify 通知，无需手动操作。
*   **📡 数据通讯**：
    *   **发送**：支持 **文本** 和 **HEX (16进制)** 两种输入模式。
    *   **接收**：实时显示接收到的数据（同时显示 HEX 和 ASCII 字符串）。
    *   **快捷指令**：底部集成 8 个快捷按钮 (`0x00` - `0x07`)，方便快速调试。
*   **📝 实时日志**：独立的日志区域，清晰展示发送、接收和系统状态信息。

## 🚀 使用步骤

1.  **导入项目**
    *   打开 **微信开发者工具**。
    *   选择“导入项目”，目录指向本项目根目录。
    *   AppID 可使用测试号或自己的 AppID。

2.  **真机调试**
    *   由于电脑端模拟器的蓝牙功能受限，**必须使用真机**进行测试。
    *   点击开发者工具的“真机调试”或“预览”，扫描二维码在手机上运行。

3.  **蓝牙搜索**
    *   确保手机蓝牙已打开，并授权微信小程序使用蓝牙权限。
    *   点击“搜索蓝牙设备”开始扫描。
    *   在输入框输入设备名称关键字（如 "Test"）可快速筛选目标设备。

4.  **设备通讯**
    *   点击设备列表中的“连接”按钮。
    *   进入详情页后，程序会自动连接并配置服务。
    *   **状态检查**：顶部状态栏显示“已连接”，且“读/写通道”均显示“就绪”时即可开始通讯。
    *   **发送数据**：
        *   勾选 "HEX发送"：输入如 `AA BB 01`（空格可选）。
        *   不勾选：直接输入文本字符串。
    *   **查看日志**：中间区域会实时滚动显示收发的数据包。

## ⚙️ 关键配置 (UUID)

在 `miniprogram/pages/device/device.js` 文件头部，可以修改目标设备的 UUID 配置：

```javascript
// 定义固定UUID常量
const TARGET_SERVICE_UUID = 'FFFF';         // 目标服务 UUID (模糊匹配)
const CHAR_UUID_WRITE = 'FF01';             // 写特征值 UUID
const CHAR_UUID_READ_NOTIFY = 'FF02';       // 读/通知特征值 UUID
```

*注：代码使用 `includes` 进行匹配，因此支持 16 位或 128 位 UUID。*

## 🛠️ 关键函数说明

### 1. 蓝牙初始化与搜索 (`pages/index/index.js`)

*   `openBluetoothAdapter()`: 初始化蓝牙模块，检查蓝牙开关状态。
*   `startBluetoothDevicesDiscovery()`: 开始搜寻附近的蓝牙外围设备。
*   `onBluetoothDeviceFound()`: 监听寻找到新设备的事件，并结合 `filterDevices()` 实现列表去重和过滤。

### 2. 连接与服务发现 (`pages/device/device.js`)

*   `createBLEConnection(deviceId)`: 连接低功耗蓝牙设备。
*   `getBLEDeviceServices(deviceId)`: 获取蓝牙设备所有服务 (Services)，并筛选出 `TARGET_SERVICE_UUID`。
*   `getBLEDeviceCharacteristics(deviceId, serviceId)`: 获取蓝牙设备某个服务中所有特征值 (Characteristics)，并定位读写特征值。

### 3. 数据收发 (`pages/device/device.js`)

*   `notifyBLECharacteristicValueChange(enable)`: 启用低功耗蓝牙设备特征值变化时的 notify 功能，订阅数据上报。
*   `writeBLECharacteristicValue()`: 向低功耗蓝牙设备特征值写入二进制数据。
    *   内部调用 `hexStringToArrayBuffer` 将 HEX 字符串转为 `ArrayBuffer`。
    *   内部调用 `stringToBuffer` 将文本转为 `ArrayBuffer`。
*   `onBLECharacteristicValueChange()`: 监听低功耗蓝牙设备的特征值变化（接收数据），并解析为 HEX 和 String 格式显示在日志中。

## 📂 目录结构

```text
miniprogram/
├── pages/
│   ├── index/          # 首页：蓝牙搜索与列表过滤
│   │   ├── index.js    # 搜索逻辑
│   │   ├── index.wxml  # 搜索界面
│   │   └── index.wxss  # 样式文件
│   └── device/         # 详情页：连接与通讯
│       ├── device.js   # 通讯核心逻辑 (连接/读写/解析)
│       ├── device.wxml # 通讯界面 (日志/按钮/输入框)
│       └── device.wxss # 样式文件
├── app.js              # 全局逻辑
└── app.json            # 全局配置
```
