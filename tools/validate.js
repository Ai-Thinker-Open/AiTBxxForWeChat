'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const repositoryRoot = path.resolve(__dirname, '..')
const BleUtils = require(path.join(repositoryRoot, 'utils', 'ble-utils'))

let registeredPage = null
global.Page = definition => {
  registeredPage = definition
}
global.wx = {}

function loadPage(relativePath) {
  registeredPage = null
  const absolutePath = path.join(repositoryRoot, relativePath)
  delete require.cache[require.resolve(absolutePath)]
  require(absolutePath)
  assert(registeredPage, `${relativePath} did not register a Page`)
  return registeredPage
}

function pageContext(definition) {
  return Object.assign({}, definition, {
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(update) {
      Object.assign(this.data, update)
    }
  })
}

function handlersIn(relativePath) {
  const content = fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
  const handlers = []
  const pattern = /bind(?:tap|input|change)="([^"]+)"/g
  let match
  while ((match = pattern.exec(content))) handlers.push(match[1])
  return handlers
}

function test(name, callback) {
  callback()
  console.log(`PASS ${name}`)
}

const indexPage = loadPage(path.join('pages', 'index', 'index.js'))
const devicePage = loadPage(path.join('pages', 'device', 'device.js'))

test('project JSON and declared pages', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'app.json'), 'utf8'))
  JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'project.config.json'), 'utf8'))
  JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'project.private.config.json'), 'utf8'))
  appConfig.pages.forEach(page => {
    ;['.js', '.json', '.wxml', '.wxss'].forEach(extension => {
      assert(fs.existsSync(path.join(repositoryRoot, page + extension)), `${page + extension} is missing`)
    })
  })
})

test('WXML event handlers resolve to page methods', () => {
  handlersIn(path.join('pages', 'index', 'index.wxml')).forEach(handler => {
    assert.strictEqual(typeof indexPage[handler], 'function', `index handler ${handler} is missing`)
  })
  handlersIn(path.join('pages', 'device', 'device.wxml')).forEach(handler => {
    assert.strictEqual(typeof devicePage[handler], 'function', `device handler ${handler} is missing`)
  })
})

test('UUID matching is normalized but remains exact', () => {
  assert(BleUtils.uuidMatches('55535343-fe7d-4ae5-8fa9-9fafd205e455', '55535343-FE7D-4AE5-8FA9-9FAFD205E455'))
  assert(!BleUtils.uuidMatches('D205E455', '55535343-FE7D-4AE5-8FA9-9FAFD205E455'))
})

test('device upsert and name filtering do not mutate input', () => {
  const original = [{ deviceId: 'A', name: 'Alpha', RSSI: -70 }]
  const updated = BleUtils.upsertDevice(original, { deviceId: 'A', name: 'Alpha', RSSI: -40 })
  const appended = BleUtils.upsertDevice(updated, { deviceId: 'B', localName: 'Beta' })
  assert.strictEqual(original[0].RSSI, -70)
  assert.strictEqual(updated[0].RSSI, -40)
  assert.strictEqual(appended.length, 2)
  assert.deepStrictEqual(BleUtils.filterDevices(appended, 'bet').map(item => item.deviceId), ['B'])
})

test('HEX and UTF-8 conversions round-trip', () => {
  assert.deepStrictEqual(BleUtils.hexToBytes('AA bb 01'), [170, 187, 1])
  assert.throws(() => BleUtils.hexToBytes('ABC'))
  assert.throws(() => BleUtils.hexToBytes('GG'))
  const text = '安信可 BLE 🙂'
  const bytes = BleUtils.stringToUtf8Bytes(text)
  assert.strictEqual(BleUtils.bytesToUtf8String(bytes), text)
  assert.strictEqual(BleUtils.bytesToHex([0, 10, 255]), '00 0A FF')
})

test('discovery failure resets retry state and listener registration is idempotent', () => {
  const context = pageContext(indexPage)
  let listenerCount = 0
  global.wx = {
    startBluetoothDevicesDiscovery(options) {
      options.fail({ errMsg: 'mock discovery failure' })
    },
    showToast() {},
    onBluetoothDeviceFound() { listenerCount += 1 }
  }
  context.startBluetoothDevicesDiscovery()
  assert.strictEqual(context._discoveryStarted, false)
  assert.strictEqual(context.data.searching, false)
  context.onBluetoothDeviceFound()
  context.onBluetoothDeviceFound()
  assert.strictEqual(listenerCount, 1)
})

test('navigation safely encodes device identifiers and names', () => {
  const context = pageContext(indexPage)
  let targetUrl = ''
  global.wx = {
    stopBluetoothDevicesDiscovery() {},
    navigateTo(options) { targetUrl = options.url }
  }
  context.createBLEConnection({
    currentTarget: { dataset: { deviceId: 'AA:BB&CC', name: 'A&B 100%' } }
  })
  assert(targetUrl.includes('deviceId=AA%3ABB%26CC'))
  assert(targetUrl.includes('name=A%26B%20100%25'))
})

test('connection changes are filtered by device', () => {
  const context = pageContext(devicePage)
  context.data.deviceId = 'target'
  context.data.connected = true
  let stateHandler
  global.wx = {
    createBLEConnection() {},
    onBLEConnectionStateChange(handler) { stateHandler = handler },
    showToast() {}
  }
  context.createBLEConnection('target')
  stateHandler({ deviceId: 'other', connected: false })
  assert.strictEqual(context.data.connected, true)
  stateHandler({ deviceId: 'target', connected: false })
  assert.strictEqual(context.data.connected, false)
})

test('Notify becomes ready only after subscription succeeds', () => {
  const context = pageContext(devicePage)
  context.data.deviceId = 'target'
  context._serviceId = 'service'
  context._notifyCharId = 'notify'
  let notifyOptions
  global.wx = {
    notifyBLECharacteristicValueChange(options) { notifyOptions = options },
    onBLECharacteristicValueChange() {}
  }
  context.notifyBLECharacteristicValueChange(true)
  assert.strictEqual(context.data.notifyReady, false)
  notifyOptions.success({})
  assert.strictEqual(context.data.notifyReady, true)
})

test('long BLE writes are split into ordered 20-byte chunks', () => {
  const context = pageContext(devicePage)
  context.data.deviceId = 'target'
  context._serviceId = 'service'
  context._writeCharId = 'write'
  const chunkSizes = []
  const originalSetTimeout = global.setTimeout
  global.setTimeout = callback => callback()
  global.wx = {
    writeBLECharacteristicValue(options) {
      chunkSizes.push(options.value.byteLength)
      options.success()
    },
    showToast() {}
  }
  try {
    context._sendBuffer(new Uint8Array(45).buffer, 'test')
  } finally {
    global.setTimeout = originalSetTimeout
  }
  assert.deepStrictEqual(chunkSizes, [20, 20, 5])
})

test('UI log storage is capped', () => {
  const context = pageContext(devicePage)
  for (let i = 0; i < 205; i++) context.addLog(`entry-${i}`, 'info')
  assert.strictEqual(context.data.logs.length, 200)
  assert.strictEqual(context.data.logs[0].content, 'entry-5')
})

console.log('RESULT 10/10 validation groups passed')
