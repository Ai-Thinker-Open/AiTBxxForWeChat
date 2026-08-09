[![English](https://img.shields.io/badge/English-README-green)](README.md)

# 安信可模组微信小程序蓝牙调试助手

## 项目介绍

这是一个基于原生微信小程序开发的蓝牙调试工具，专为安信可COMBOAT蓝牙模组设备调试设计。项目不依赖第三方框架，代码简洁易维护。

## ✨ 主要功能

*   **🔍 蓝牙搜索与过滤**：支持实时搜索周边 BLE 设备，并可通过名称关键字实时过滤列表。
*   **🔗 自动连接与配置**：
    *   连接后自动寻找目标服务 UUID (`55535343-FE7D-4AE5-8FA9-9FAFD205E455`)。
    *   自动识别并配置写特征值 (`49535343-8841-43F4-A8D4-ECBE34729BB3`) 和通知特征值 (`49535343-1E4D-4BD9-BA61-23C647249616`)。
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

在 `pages/device/device.js` 文件头部，可以修改目标设备的 UUID 配置：

```javascript
// 定义固定UUID常量
const TARGET_SERVICE_UUID = '55535343-FE7D-4AE5-8FA9-9FAFD205E455';         // 目标服务 UUID（精确匹配）
const CHAR_UUID_WRITE = '49535343-8841-43F4-A8D4-ECBE34729BB3';             // 写特征值 UUID
const CHAR_UUID_READ_NOTIFY = '49535343-1E4D-4BD9-BA61-23C647249616';       // 读/通知特征值 UUID
```

*注：UUID 比较不区分大小写并忽略连字符，但要求归一化后完全一致；特征值还必须具备对应的 Write 或 Notify/Indicate 属性。*

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
*   `initValueChangeListener()`: 注册低功耗蓝牙特征值变化监听（接收数据），按当前设备过滤，并解析为 HEX 和 UTF-8 文本显示在日志中。

## 📂 目录结构

```text
AiTBxxForWeChat/
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

## ✅ 稳定性与数据处理

- 搜索启动失败后会复位内部状态，可直接重试。
- 设备发现、连接状态和特征值监听器会避免重复注册，并在页面卸载时注销。
- 连接和接收事件按当前设备 ID 过滤，避免其他 BLE 连接干扰页面状态。
- Notify 订阅成功后才显示“读通道就绪”。
- 文本按 UTF-8 编码，可正确发送中文；HEX 输入执行字符和偶数长度校验。
- 长数据按 20 字节顺序分包，失败日志会标出具体分包序号。
- 页面只保留最近 200 条日志，避免长时间运行持续占用内存。

## 🧪 本地验证

已安装 Node.js 时可执行：

```powershell
node --check pages/index/index.js
node --check pages/device/device.js
node tools/validate.js
```

验证覆盖项目与页面声明、WXML 事件处理器、UUID 匹配、设备过滤、UTF-8/HEX 转换、搜索重试状态、监听器幂等、导航参数编码、连接事件过滤、Notify 就绪状态、BLE 分包和日志上限。

详细证据：

- [代码入口](docs/CODE_ENTRY.zh.md)
- [架构说明](docs/ARCHITECTURE.zh.md)
- [验证记录](docs/VALIDATION.zh.md)

## 🔧 问题排查

- **蓝牙无法初始化：** 打开手机蓝牙、授予微信相应权限，然后重新搜索。
- **搜索不到设备：** 确认外围设备正在广播非空名称，并缩短手机与设备的距离。
- **找不到目标服务：** 核对外围设备固件是否暴露了完全一致的服务 UUID。
- **读写通道未就绪：** 同时核对特征值 UUID 及其 Write、Notify/Indicate 属性。
- **发送失败：** 降低发送频率、重新连接，并在日志中查看失败的分包序号。
- **接收文字显示异常：** 优先查看 HEX；任意 BLE 数据不一定是 UTF-8 文本。

## 🤝 贡献与验证边界

提交拉取请求时请注明手机系统、微信版本、外围设备固件、复现步骤和日志。不要提交凭据、私有 AppID、个人数据或设备密钥。

自动验证使用模拟的微信 API，不能证明真实蓝牙射频行为。本次没有使用微信开发者工具、手机或 TB 系列模组进行联调；真机发现、权限行为、MTU 协商、断线恢复、吞吐量和业务协议仍需人工验收。

## License

本仓库当前没有仓库级 License 文件，请勿把公开可见等同于已获得复制、修改或再分发授权。
