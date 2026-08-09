[![中文](https://img.shields.io/badge/中文-README-blue)](CODE_ENTRY.zh.md)

# Code entry

## Application registration

`app.js` registers the Mini Program with `App(...)`; its `onLaunch()` callback is the global startup hook. `app.json` declares two page routes in order:

1. `pages/index/index` — the initial BLE discovery page.
2. `pages/device/device` — the connection and data-transfer page.

The validation script parses `app.json` and confirms that each declared page has matching `.js`, `.json`, `.wxml`, and `.wxss` files.

## Search-page entry

The initial user entry is the `toggleSearch` handler bound in `pages/index/index.wxml`. Its verified call flow is:

```text
toggleSearch
  -> openBluetoothAdapter
  -> startBluetoothDevicesDiscovery
  -> onBluetoothDeviceFound
  -> upsert/filter device list
  -> createBLEConnection(page event)
  -> stop discovery
  -> wx.navigateTo(device route)
```

`tools/validate.js` confirms that all WXML event names resolve to actual page methods, discovery failure restores retry state, listener registration is idempotent, and device identifiers and names are URL-encoded.

## Device-page entry

`pages/device/device.js:onLoad()` safely decodes the selected device parameters and calls `createBLEConnection(deviceId)`. A successful connection proceeds through service discovery, characteristic discovery, Notify subscription, and the text/HEX send interface.

The receive path is registered only after Notify succeeds. The send path converts user input to bytes and writes ordered chunks through `wx.writeBLECharacteristicValue`.

## Scope

The entry and call chains are supported by source and mock-driven logic tests. They have not been executed here inside WeChat Developer Tools or against a physical BLE peripheral.
