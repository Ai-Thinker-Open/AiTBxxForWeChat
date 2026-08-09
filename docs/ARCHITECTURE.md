[![中文](https://img.shields.io/badge/中文-README-blue)](ARCHITECTURE.zh.md)

# Architecture

## Classification and boundary

This repository is a native WeChat Mini Program Demo, not a firmware SDK. It contains JavaScript page logic, WXML views, WXSS styles, JSON configuration, one image asset, shared BLE utilities, and a dependency-free validation script. The actual BLE stack and permissions are provided by the WeChat runtime and phone operating system.

## Verified modules

| Module | Responsibility | Evidence |
| --- | --- | --- |
| Application configuration | Register pages and window, permission, sitemap, and compiler settings | `app.js`, `app.json`, `project.config.json` |
| Discovery page | Open/close the adapter, start/stop discovery, deduplicate/filter devices, navigate safely | `pages/index/index.js` and `.wxml` |
| Device session | Connect/disconnect, track state for the selected device, discover services and characteristics | `pages/device/device.js` |
| Data channel | Subscribe to Notify, receive data, validate text/HEX input, and write ordered chunks | `pages/device/device.js` and `.wxml` |
| Shared BLE utilities | UUID normalization, immutable list operations, safe decoding, HEX and UTF-8 conversion | `utils/ble-utils.js` |
| Validation | Check source syntax, project structure, handlers, and mocked page behavior | `tools/validate.js` |

## Runtime flow

```text
App launch
  -> search page
     -> Bluetooth adapter
     -> discovery listener
     -> deduplicated/filtered devices
     -> selected device route
        -> BLE connection
        -> exact service lookup
        -> characteristic UUID + property checks
        -> Notify subscription
        -> receive log / UTF-8 or HEX send
        -> ordered 20-byte writes
```

## State and lifecycle rules

- Search failure clears `_discoveryStarted`, allowing a retry.
- Discovery, connection-state, and value-change callbacks are stored so they can be registered once and removed on unload.
- Connection and notification events are accepted only for the selected device.
- `writeReady` requires a matching Write-capable characteristic; `notifyReady` is set only after subscription succeeds.
- Device lists are copied before update, and the UI log retains at most 200 entries.
- Closing the device page clears connection and characteristic state.

## External dependencies and risks

There are no third-party JavaScript packages. Runtime behavior still depends on the WeChat base library, phone Bluetooth implementation, user permissions, peripheral firmware, and the configured proprietary UUID/protocol contract. Conservative 20-byte chunking improves compatibility but does not define application-level framing or acknowledgements.

The repository currently has no License file. This is a governance and reuse constraint rather than an application-runtime defect.
