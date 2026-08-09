function safeDecodeURIComponent(value) {
  var text = String(value || '')
  try {
    return decodeURIComponent(text)
  } catch (error) {
    return text
  }
}

function normalizeUuid(value) {
  return String(value || '').replace(/-/g, '').toUpperCase()
}

function uuidMatches(actual, expected) {
  var normalizedActual = normalizeUuid(actual)
  var normalizedExpected = normalizeUuid(expected)
  return normalizedActual === normalizedExpected
}

function upsertDevice(devices, device) {
  var result = (devices || []).slice()
  if (!device || !device.deviceId) return result

  var index = -1
  for (var i = 0; i < result.length; i++) {
    if (result[i].deviceId === device.deviceId) {
      index = i
      break
    }
  }

  if (index === -1) result.push(device)
  else result[index] = device
  return result
}

function filterDevices(devices, keyword) {
  var normalizedKeyword = String(keyword || '').toLowerCase()
  var source = (devices || []).slice()
  if (!normalizedKeyword) return source

  return source.filter(function (device) {
    var name = String(device.name || device.localName || '').toLowerCase()
    return name.indexOf(normalizedKeyword) !== -1
  })
}

function hexToBytes(value) {
  var text = String(value || '').replace(/\s+/g, '')
  if (!text) throw new Error('HEX data is empty')
  if (!/^[0-9A-Fa-f]+$/.test(text)) throw new Error('HEX data contains invalid characters')
  if (text.length % 2 !== 0) throw new Error('HEX data length must be even')

  var bytes = []
  for (var i = 0; i < text.length; i += 2) {
    bytes.push(parseInt(text.substr(i, 2), 16))
  }
  return bytes
}

function stringToUtf8Bytes(value) {
  var encoded = unescape(encodeURIComponent(String(value || '')))
  var bytes = []
  for (var i = 0; i < encoded.length; i++) bytes.push(encoded.charCodeAt(i))
  return bytes
}

function bytesToHex(bytes) {
  var output = []
  for (var i = 0; i < bytes.length; i++) {
    output.push(('00' + Number(bytes[i]).toString(16)).slice(-2))
  }
  return output.join(' ').toUpperCase()
}

function bytesToUtf8String(bytes) {
  var encoded = ''
  for (var i = 0; i < bytes.length; i++) {
    encoded += '%' + ('00' + Number(bytes[i]).toString(16)).slice(-2)
  }
  try {
    return decodeURIComponent(encoded)
  } catch (error) {
    var fallback = ''
    for (var j = 0; j < bytes.length; j++) fallback += String.fromCharCode(bytes[j])
    return fallback
  }
}

module.exports = {
  safeDecodeURIComponent: safeDecodeURIComponent,
  normalizeUuid: normalizeUuid,
  uuidMatches: uuidMatches,
  upsertDevice: upsertDevice,
  filterDevices: filterDevices,
  hexToBytes: hexToBytes,
  stringToUtf8Bytes: stringToUtf8Bytes,
  bytesToHex: bytesToHex,
  bytesToUtf8String: bytesToUtf8String
}
