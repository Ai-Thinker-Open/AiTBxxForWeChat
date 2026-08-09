[![English](https://img.shields.io/badge/English-README-green)](CODE_ENTRY.md)

# 代码入口

## 应用注册

`app.js` 通过 `App(...)` 注册小程序，`onLaunch()` 是全局启动钩子。`app.json` 按顺序声明两个页面路由：

1. `pages/index/index` —— 初始 BLE 搜索页面。
2. `pages/device/device` —— 连接和数据收发页面。

验证脚本会解析 `app.json`，并确认每个声明页面都具备对应的 `.js`、`.json`、`.wxml` 和 `.wxss` 文件。

## 搜索页入口

首个用户入口是 `pages/index/index.wxml` 绑定的 `toggleSearch` 处理器。已核验调用流程如下：

```text
toggleSearch
  -> openBluetoothAdapter
  -> startBluetoothDevicesDiscovery
  -> onBluetoothDeviceFound
  -> 设备列表更新/过滤
  -> createBLEConnection（页面事件）
  -> 停止搜索
  -> wx.navigateTo（设备页路由）
```

`tools/validate.js` 确认所有 WXML 事件名都能对应真实页面方法，搜索失败会恢复可重试状态，监听器不会重复注册，设备 ID 和名称会进行 URL 编码。

## 设备页入口

`pages/device/device.js:onLoad()` 安全解码选中设备参数，并调用 `createBLEConnection(deviceId)`。连接成功后依次发现服务、发现特征值、订阅 Notify，最后开放文本/HEX 发送界面。

接收路径只在 Notify 成功后注册；发送路径把用户输入转换为字节，再通过 `wx.writeBLECharacteristicValue` 顺序写入分包。

## 验证范围

代码入口和调用链已经由源码及模拟逻辑测试支撑，但本次没有在微信开发者工具中运行，也没有连接真实 BLE 外围设备。
