[![中文](https://img.shields.io/badge/中文-README-blue)](VALIDATION.zh.md)

# Validation

## Result

Static and mock-driven logic validation passed for commit `d1a81206b0cbaa60e5ba7acc01e2199db472f75c` on 2026-08-09.

| Item | Result |
| --- | --- |
| Environment | Windows NT 10.0.26200.0 |
| Runtime | Node.js v24.14.0 |
| JavaScript syntax | 5/5 tracked `.js` files passed `node --check` |
| Logic groups | 10/10 passed |
| Errors | 0 |
| Warnings | 0 |
| Full log | `validation-logs/AiTBxxForWeChat-validation.log` |

## Covered behavior

`tools/validate.js` loads the real page definitions with controlled WeChat API mocks and checks:

1. JSON parsing, declared page routes, and required page files.
2. WXML event handlers resolving to real JavaScript methods.
3. Case/hyphen-normalized but exact UUID matching.
4. Immutable device upsert, deduplication, and name filtering.
5. HEX validation and UTF-8 round-trip, including Chinese and emoji.
6. Discovery failure restoring a retryable state and idempotent listener registration.
7. URL-safe navigation for device identifiers and names.
8. Connection events being ignored for unrelated devices.
9. Notify readiness changing only after successful subscription.
10. Ordered `20 + 20 + 5` byte writes for a 45-byte payload and a 200-entry log cap.

## Reproduce

```powershell
node --check app.js
node --check pages/index/index.js
node --check pages/device/device.js
node --check tools/validate.js
node --check utils/ble-utils.js
node tools/validate.js
```

## Validation boundary

This is not a build artifact or physical BLE test. The test harness does not emulate the complete WeChat runtime, phone Bluetooth controller, permission model, radio timing, or peripheral protocol. The following remain unverified:

- import and preview in the current WeChat Developer Tools;
- Android and iOS permission behavior;
- discovery and reconnect behavior with real radio interference;
- MTU negotiation and sustained multi-packet throughput;
- UUID and command compatibility with specific TB-series firmware;
- disconnects during an in-progress multi-chunk write.

A real-device acceptance run should record the phone OS, WeChat/base-library versions, module firmware, distance/interference conditions, test payloads, and observed logs.
