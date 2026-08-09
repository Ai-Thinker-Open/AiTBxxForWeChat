[![中文](https://img.shields.io/badge/中文-README-blue)](README.zh.md)

# Ai-Thinker BLE Debugging Assistant for WeChat Mini Program

## Project overview

AiTBxxForWeChat is a native WeChat Mini Program Demo for discovering, connecting to, and exchanging data with Ai-Thinker BLE devices. The current configuration targets the COMBOAT/TB-series transparent-transmission service and does not require a third-party JavaScript framework.

## Features

- Discover nearby BLE peripherals and filter them by advertised name.
- Connect to a selected device and discover the configured service and characteristics.
- Subscribe to notifications only after the characteristic and its properties are verified.
- Send text as UTF-8 or validated hexadecimal bytes.
- Split long writes into ordered 20-byte chunks for conservative cross-platform BLE operation.
- Display bounded transmit, receive, connection, and error logs.
- Send eight one-byte quick commands from `0x00` through `0x07`.

## Setup requirements

- WeChat Developer Tools.
- A physical iOS or Android device with Bluetooth enabled; the desktop simulator cannot complete real BLE validation.
- A compatible peripheral exposing the UUIDs listed below.
- Bluetooth and location permissions required by the device platform and WeChat version.

## Import and run

1. Clone or download this repository.
2. Open WeChat Developer Tools and choose **Import Project**.
3. Select the repository root—the directory containing `app.json` and `project.config.json`.
4. Use the configured AppID, a test AppID, or your own AppID as appropriate.
5. Choose preview or real-device debugging and authorize Bluetooth access.
6. Tap **Search Bluetooth Devices**, select the target peripheral, and wait until the connection, Write, and Notify states are ready.

## Usage examples

- Text mode: enter `hello` or `安信可`; the application encodes the string as UTF-8 before sending.
- HEX mode: enter `AA BB 01` or `AABB01`; non-hexadecimal or odd-length input is rejected.
- Quick commands: tap one of the fixed buttons to send a single byte from `00` to `07`.

## BLE configuration

The constants are defined at the top of `pages/device/device.js`:

| Purpose | UUID |
| --- | --- |
| Primary service | `55535343-FE7D-4AE5-8FA9-9FAFD205E455` |
| Write characteristic | `49535343-8841-43F4-A8D4-ECBE34729BB3` |
| Notify characteristic | `49535343-1E4D-4BD9-BA61-23C647249616` |

UUID comparison is case-insensitive and ignores hyphens, but remains an exact match. A characteristic is accepted only when its advertised properties support the required Write or Notify/Indicate operation.

## Code flow

1. `app.json` registers the search and device pages.
2. `pages/index/index.js` opens the Bluetooth adapter, starts discovery, deduplicates and filters advertisements, stops discovery, and safely navigates with the selected device data.
3. `pages/device/device.js` connects, discovers the target service and characteristics, subscribes to notifications, and exposes text/HEX send operations.
4. `utils/ble-utils.js` provides exact UUID matching, immutable device-list helpers, safe query decoding, and HEX/UTF-8 conversion.
5. Page unload handlers unregister listeners and close the BLE connection or adapter.

Detailed evidence:

- [Code entry](docs/CODE_ENTRY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Validation](docs/VALIDATION.md)

## Local validation

With Node.js available, run:

```powershell
node --check pages/index/index.js
node --check pages/device/device.js
node tools/validate.js
```

The validation script checks project/page declarations, WXML handlers, UUID matching, device filtering, UTF-8/HEX conversion, retry state, listener registration, navigation encoding, connection-event filtering, Notify readiness, BLE chunking, and the log limit.

## Troubleshooting

- **Bluetooth cannot initialize:** enable Bluetooth, grant WeChat permissions, and retry on a physical device.
- **No devices appear:** verify the peripheral is advertising a non-empty name and move it closer to the phone.
- **Target service is missing:** confirm the peripheral firmware exposes the exact configured service UUID.
- **Write or Notify is not ready:** confirm both characteristic UUIDs and their advertised properties.
- **Write fails:** reduce traffic frequency, reconnect the device, and inspect which chunk failed in the log.
- **Received text looks binary:** use the HEX view; arbitrary BLE payloads are not necessarily UTF-8 text.

## Contribution and validation boundary

Keep changes focused and include the phone OS, WeChat version, peripheral firmware, reproduction steps, and logs in pull requests. Do not commit credentials, private AppIDs, captured personal data, or device secrets.

Automated validation uses mocks and does not prove Bluetooth radio behavior. The repository has not been verified here with WeChat Developer Tools, a phone, a TB-series module, or production traffic. Real-device discovery, permission behavior, MTU negotiation, connection recovery, throughput, and protocol semantics still require manual acceptance testing.

## License

This repository currently has no repository-level license file. Do not assume redistribution rights beyond those granted by the copyright holder.
