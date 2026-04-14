const MAX_KTW_SIZE_BYTES = 1024 * 1024

const API_ERROR_MESSAGES = {
  INVALID_KTW: 'File is not a valid KTW binary',
  BUNDLE_TOO_LARGE: 'Bundle exceeds 50 screens',
  UNSUPPORTED_MEDIA_TYPE: 'Wrong content type — use a .ktw file',
  FORBIDDEN: "You don't own this app",
  CONFLICT: 'App ID already exists',
  PAYLOAD_TOO_LARGE: 'File exceeds 1 MB limit',
  INVALID_VERSION: 'Version must be in MAJOR.MINOR.PATCH format (e.g. 1.0.3)',
  INVALID_JSON: 'Request body is not valid JSON',
  MISSING_FIELDS: 'A required field is missing from the request',
  VERSION_TAKEN: 'This version already exists. Choose a different version number.',
  NO_PENDING_VERIFICATION: "Call 'Verify Domain' first to generate a token",
  TOKEN_EXPIRED: 'Verification token expired — request a new one',
  INVALID_BUNDLE_ID: 'Bundle ID needs at least 3 segments to verify (e.g. com.example.app)',
  FREE_TIER_NOT_ELIGIBLE: 'Domain verification is not available for free-tier apps',
  INVALID_PARAMS: 'Invalid parameter value',
  INVALID_LABEL: 'API key label must be between 1 and 64 characters',
  INVALID_USERNAME: 'Username must be lowercase letters, numbers, or hyphens, min 2 characters',
  NAMESPACE_NOT_VERIFIED: 'Verify your namespace before uploading screens',
  PROFILE_INCOMPLETE: 'Complete your profile before creating an app',
  INVALID_NAME: 'Name must be between 1 and 100 characters',
  INVALID_PURPOSE: 'Purpose must be: personal_testing, company_work, or personal_production',
  INVALID_USER_BASE: 'User base must be one of: lt_100, lt_1k, lt_10k, lt_100k, lt_500k, 1m_plus'
}

const readFilePrefix = async (file, length) => {
  const buffer = await file.slice(0, length).arrayBuffer()
  return new Uint8Array(buffer)
}

const readFileBytes = async (file) => {
  const buffer = await file.arrayBuffer()
  return new Uint8Array(buffer)
}

const formatBytesForHint = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ')

const startsWithKtw = (bytes) => bytes.length >= 3 && bytes[0] === 0x4b && bytes[1] === 0x54 && bytes[2] === 0x57

const startsWithGzip = (bytes) => bytes.length >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b && bytes[2] === 0x08

const gunzipBytes = async (bytes) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Gzip file detected but this browser does not support decompression. Please upload a decompressed file.')
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

const ensureKtwHeader = (bytes) => {
  if (startsWithKtw(bytes)) return { bytes, repaired: false }

  const repaired = new Uint8Array(bytes.length + 3)
  repaired[0] = 0x4b
  repaired[1] = 0x54
  repaired[2] = 0x57
  repaired.set(bytes, 3)
  return { bytes: repaired, repaired: true }
}

export const validateVersionCode = (value) => {
  const version = String(value || '').trim()
  if (!version) return 'Version code is required.'
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return API_ERROR_MESSAGES.INVALID_VERSION
  }
  return ''
}

export const validateKtwFile = async (file) => {
  if (!file) return 'Select a .ktw file to upload.'
  if (file.size < 4) return 'File is not a valid KTW binary'
  if (file.size > MAX_KTW_SIZE_BYTES) return API_ERROR_MESSAGES.PAYLOAD_TOO_LARGE

  // Accept .ktw, .gz, and extensionless files from different toolchains.
  // We normalize content before upload in `prepareKtwUploadBinary`.

  return ''
}

export const prepareKtwUploadBinary = async (file) => {
  let bytes = await readFileBytes(file)
  const notices = []

  if (startsWithGzip(bytes)) {
    bytes = await gunzipBytes(bytes)
    notices.push('Detected gzip-compressed input and decompressed it automatically.')
  }

  if (bytes.length < 4) {
    throw new Error('File is not a valid KTW binary')
  }

  const { bytes: ktwBytes, repaired } = ensureKtwHeader(bytes)
  if (repaired) {
    const prefix = ktwBytes.slice(0, 3)
    if (!startsWithKtw(prefix)) {
      throw new Error(`File is not a valid KTW binary (first bytes: ${formatBytesForHint(prefix)}; expected: 4B 54 57).`)
    }
    notices.push('Added missing KTW header for compatibility with legacy/exported payload.')
  }

  return {
    binary: new Blob([ktwBytes], { type: 'application/octet-stream' }),
    notice: notices.join(' ')
  }
}

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file for upload.'))
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.includes(',') ? result.split(',')[1] : ''
      if (!base64) {
        reject(new Error('Failed to convert file to base64.'))
        return
      }
      resolve(base64)
    }
    reader.readAsDataURL(file)
  })

export const formatKtwSizeKb = (bytes) => {
  if (bytes == null || Number.isNaN(Number(bytes))) return '-'
  return `${(Number(bytes) / 1024).toFixed(2)} KB`
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

export const truncateId = (value, start = 8, end = 6) => {
  if (!value) return '-'
  if (value.length <= start + end + 3) return value
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export const mapApiErrorMessage = (error, fallback = 'Request failed') => {
  const code = error?.response?.data?.error?.code
  if (code && API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code]

  if (error?.response?.status === 403) return API_ERROR_MESSAGES.FORBIDDEN

  return error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback
}

export const isFreeTierApp = (bundleId) => String(bundleId || '').startsWith('dev.ketoy.')

export { API_ERROR_MESSAGES, MAX_KTW_SIZE_BYTES }
