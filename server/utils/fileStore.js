import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import logger from './logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const DATA_DIR = process.env.DATA_DIR || './data'
export const CACHE_DIR = path.join(DATA_DIR, 'cache')

// File paths
const FILES = {
  configs: path.join(DATA_DIR, 'configs.json'),
  settings: path.join(DATA_DIR, 'settings.json')
}

/**
 * Initialize data directory and default files
 */
export async function initDataDir() {
  const absoluteDataDir = path.resolve(DATA_DIR)
  logger.debug(`Checking data directory: ${absoluteDataDir}`)

  // Create directories
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.mkdir(CACHE_DIR, { recursive: true })

  // Initialize default data files
  const defaults = {
    configs: {
      configs: [
        {
          id: 'default',
          name: 'default config',
          content: getDefaultConfigTemplate(),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    },
    settings: {
      admin: {
        username: 'admin',
        password:
          '0b71123dc29f5a735dfa17f0407e5ade:7aa5bc95323bce3fe8ed336ac327b862e09e4cd64f7c985bb53c17baf4c83b9554b2f99d5a92ea6582c1317b2b7f7d8ee7739eb42e381d4004f60ca79e6ec29c',
        lastLogin: null
      },
      subscribe: {
        token: crypto.randomBytes(16).toString('hex'),
        enabled: true
      }
    }
  }

  for (const [key, defaultData] of Object.entries(defaults)) {
    const filePath = FILES[key]
    let shouldInitialize = false

    try {
      const stats = await fs.stat(filePath)
      if (stats.size === 0) {
        shouldInitialize = true
      }
    } catch {
      shouldInitialize = true
    }

    if (shouldInitialize) {
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2))
      logger.info(`Initialized default ${key}.json in ${absoluteDataDir}`)
    }
  }
}

/**
 * Read data from a JSON file
 */
export async function readData(type) {
  const filePath = FILES[type]
  if (!filePath) {
    throw new Error(`Unknown data type: ${type}`)
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    if (!content.trim()) {
      logger.debug(`readData('${type}'): File is empty`)
      return null
    }
    const data = JSON.parse(content)
    logger.debug(`readData('${type}'): Successfully parsed JSON`)
    return data
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      logger.warn(`Data file ${filePath} is missing or invalid, returning null`)
      return null
    }
    throw error
  }
}

const locks = {}

/**
 * Get or create a lock for a specific data type
 */
function getLock(type) {
  if (!locks[type]) {
    let currentPromise = Promise.resolve()
    locks[type] = {
      acquire: () => {
        let release
        const nextPromise = new Promise(resolve => {
          release = resolve
        })
        const wait = currentPromise
        currentPromise = currentPromise.then(() => nextPromise)
        return wait.then(() => release)
      }
    }
  }
  return locks[type]
}

/**
 * Write data to a JSON file
 */
export async function writeData(type, data) {
  const filePath = FILES[type]
  if (!filePath) {
    throw new Error(`Unknown data type: ${type}`)
  }

  const release = await getLock(type).acquire()
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  } finally {
    release()
  }
}

/**
 * Perform an atomic update on a data file
 * @param {string} type - Data type (configs, settings)
 * @param {Function} updateFn - Function that receives current data and returns updated data
 */
export async function updateData(type, updateFn) {
  const release = await getLock(type).acquire()
  try {
    const currentData = await readData(type)
    const updatedData = await updateFn(currentData)
    if (updatedData !== undefined) {
      const filePath = FILES[type]
      await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2))
    }
    return updatedData
  } finally {
    release()
  }
}

/**
 * Read provider cache
 */
export async function readCache(providerId) {
  const cachePath = path.join(CACHE_DIR, `${providerId}.yaml`)
  try {
    return await fs.readFile(cachePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Write provider cache
 */
export async function writeCache(providerId, content) {
  const cachePath = path.join(CACHE_DIR, `${providerId}.yaml`)
  await fs.writeFile(cachePath, content)
}

/**
 * Get cache file modification time
 */
export async function getCacheTime(providerId) {
  const cachePath = path.join(CACHE_DIR, `${providerId}.yaml`)
  try {
    const stats = await fs.stat(cachePath)
    return stats.mtime
  } catch {
    return null
  }
}

const DEFAULT_CONFIG_PATH = path.join(__dirname, '../defaults/default-config.yaml')

/**
 * Default Clash config template
 */
export function getDefaultConfigTemplate() {
  try {
    return fsSync.readFileSync(DEFAULT_CONFIG_PATH, 'utf-8')
  } catch (error) {
    logger.error(`Failed to read default config template: ${error.message}`)
    return ''
  }
}
