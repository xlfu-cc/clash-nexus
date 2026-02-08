import { readData, updateData } from '../utils/fileStore.js'
import crypto from 'crypto'
import logger from '../utils/logger.js'

/**
 * Authenticate admin user
 * @returns {Promise<{token: string}|null>} Token if successful, null otherwise
 */
export async function login(username, password) {
  const settings = await readData('settings')
  const admin = settings.admin

  if (admin.username === username) {
    if (await verifyPassword(password, admin.password)) {
      // Login success
      const token = crypto.randomBytes(32).toString('hex')

      global.ADMIN_SESSIONS = global.ADMIN_SESSIONS || new Set()
      global.ADMIN_SESSIONS.add(token)

      await updateData('settings', data => {
        data.admin.lastLogin = new Date().toISOString()
        return data
      })

      logger.info(`Admin login successful: ${username}`)
      return { token }
    } else {
      logger.warn(`Admin login failed: Invalid password for ${username}`)
    }
  } else {
    logger.warn(`Admin login failed: Invalid username ${username}`)
  }

  return null
}

/**
 * Change admin password
 */
export async function changePassword(oldPassword, newPassword) {
  const settings = await readData('settings')

  // Verify old password
  if (!(await verifyPassword(oldPassword, settings.admin.password))) {
    throw new Error('Invalid old password')
  }

  const hashedPassword = await hashPassword(newPassword)

  await updateData('settings', data => {
    data.admin.password = hashedPassword
    return data
  })

  logger.info('Admin password changed successfully')
  // Invalidate all sessions.
  global.ADMIN_SESSIONS.clear()
}

/**
 * Update admin username
 */
export async function updateUsername(newUsername) {
  await updateData('settings', data => {
    data.admin.username = newUsername
    return data
  })

  logger.info(`Admin username updated to: ${newUsername}`)
  // Invalidate all sessions to force re-login with new username (optional but safer)
  global.ADMIN_SESSIONS.clear()
}

// --- Helper Functions ---

/**
 * Hash password using scrypt
 * Format: salt:hash
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(`${salt}:${derivedKey.toString('hex')}`)
    })
  })
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = storedHash.split(':')

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(key === derivedKey.toString('hex'))
    })
  })
}

/**
 * Get current subscribe token
 */
export async function getSubscribeToken() {
  const settings = await readData('settings')
  return settings.subscribe.token
}

/**
 * Rotate subscribe token
 */
export async function rotateSubscribeToken() {
  const settings = await readData('settings')
  const newToken = crypto.randomBytes(16).toString('hex')

  await updateData('settings', data => {
    data.subscribe.token = newToken
    return data
  })

  logger.info('Subscribe token rotated')
  return newToken
}

/**
 * Verify admin session token
 */
export function verifyAdminToken(token) {
  // Check in-memory sessions
  if (global.ADMIN_SESSIONS && global.ADMIN_SESSIONS.has(token)) {
    return true
  }

  return false
}
/**
 * Logout admin user
 * @param {string} token - Token to invalidate
 */
export async function logout(token) {
  if (global.ADMIN_SESSIONS) {
    global.ADMIN_SESSIONS.delete(token)
  }
}
