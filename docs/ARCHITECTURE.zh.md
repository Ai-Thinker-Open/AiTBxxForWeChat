[![English](https://img.shields.io/badge/English-README-green)](ARCHITECTURE.md)

# 架构说明

## 类型与边界

本仓库是原生微信小程序 Demo，不是固件 SDK。内容包括 JavaScript 页面逻辑、WXML 视图、WXSS 样式、JSON 配置、一项图片资源、共享 BLE 工具函数和无第三方依赖的验证脚本。真实 BLE 协议栈和权限由微信运行时及手机操作系统提供。

## 已核验模块

| 模块 | 职责 | 证据 |
| --- | --- | --- |
| 应用配置 | 注册页面以及窗口、权限、sitemap 和编译设置 | `app.js`、`app.json`、`project.config.json` |
| 搜索页面 | 开关适配器、启停搜索、设备去重/过滤和安全导航 | `pages/index/index.js` 和 `.wxml` |
| 设备会话 | 连接/断开、跟踪选中设备状态、发现服务和特征值 | `pages/device/device.js` |
| 数据通道 | 订阅 Notify、接收数据、校验文本/HEX 输入并顺序分包写入 | `pages/device/device.js` 和 `.wxml` |
| 共享 BLE 工具 | UUID 归一化、不可变列表操作、安全解码、HEX 和 UTF-8 转换 | `utils/ble-utils.js` |
| 验证 | 检查源码语法、项目结构、事件处理器和模拟页面行为 | `tools/validate.js` |

## 运行流程

```text
应用启动
  -> 搜索页面
     -> 蓝牙适配器
     -> 设备发现监听
     -> 去重/过滤后的设备
     -> 选中设备路由
        -> BLE 连接
        -> 精确查找服务
        -> 特征值 UUID + 属性检查
        -> Notify 订阅
        -> 接收日志 / UTF-8 或 HEX 发送
        -> 顺序写入 20 字节分包
```

## 状态与生命周期规则

- 搜索失败会清除 `_discoveryStarted`，允许再次尝试。
- 设备发现、连接状态和特征值变化回调会被保存，确保只注册一次并能在页面卸载时注销。
- 连接与通知事件只接受当前选中设备的数据。
- `writeReady` 要求匹配且支持 Write 的特征值；`notifyReady` 只在订阅成功后置位。
- 设备列表先复制再更新，界面最多保留最近 200 条日志。
- 关闭设备页会清除连接和特征值状态。

## 外部依赖与风险

项目没有第三方 JavaScript 包。运行时仍依赖微信基础库、手机蓝牙实现、用户权限、外围设备固件及已配置的专用 UUID/协议约定。保守的 20 字节分包提高兼容性，但不能替代业务层的帧结构和确认机制。

仓库当前没有 License 文件。这是治理与复用限制，不是应用运行时缺陷。
