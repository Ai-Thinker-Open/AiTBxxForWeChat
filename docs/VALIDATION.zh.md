[![English](https://img.shields.io/badge/English-README-green)](VALIDATION.md)

# 验证记录

## 结果

2026-08-09 在提交 `d1a81206b0cbaa60e5ba7acc01e2199db472f75c` 上完成静态检查和模拟逻辑验证，全部通过。

| 项目 | 结果 |
| --- | --- |
| 环境 | Windows NT 10.0.26200.0 |
| 运行时 | Node.js v24.14.0 |
| JavaScript 语法 | 5/5 个受跟踪 `.js` 文件通过 `node --check` |
| 逻辑测试组 | 10/10 通过 |
| 错误 | 0 |
| 警告 | 0 |
| 完整日志 | `validation-logs/AiTBxxForWeChat-validation.log` |

## 覆盖行为

`tools/validate.js` 使用可控的微信 API 模拟对象加载真实页面定义，并检查：

1. JSON 解析、页面路由声明及必需页面文件。
2. WXML 事件处理器能对应真实 JavaScript 方法。
3. 不区分大小写、忽略连字符但保持精确的 UUID 匹配。
4. 不修改输入的设备更新、去重和名称过滤。
5. HEX 校验以及包含中文和 Emoji 的 UTF-8 往返。
6. 搜索失败后恢复可重试状态，监听器注册保持幂等。
7. 设备 ID 和名称经过 URL 安全编码。
8. 忽略其他设备的连接状态事件。
9. Notify 只在订阅成功后显示就绪。
10. 45 字节数据按 `20 + 20 + 5` 顺序写入，并限制日志为 200 条。

## 复现方式

```powershell
node --check app.js
node --check pages/index/index.js
node --check pages/device/device.js
node --check tools/validate.js
node --check utils/ble-utils.js
node tools/validate.js
```

## 验证边界

这不是构建产物或真实 BLE 测试。测试框架没有模拟完整微信运行时、手机蓝牙控制器、权限模型、射频时序或外围设备协议。以下内容仍未验证：

- 当前微信开发者工具中的导入和预览；
- Android 与 iOS 权限行为；
- 真实射频干扰下的发现和重连；
- MTU 协商和持续多包吞吐；
- 特定 TB 系列固件的 UUID 与指令兼容性；
- 多分包发送过程中断线的行为。

真机验收应记录手机系统、微信/基础库版本、模组固件、距离/干扰条件、测试载荷和实际日志。
