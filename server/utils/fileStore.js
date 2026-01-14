/**
 * File-based data storage utility
 * Handles reading and writing JSON data files
 */
const fs = require('fs').promises
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || './data'
const CACHE_DIR = path.join(DATA_DIR, 'cache')

// File paths
const FILES = {
  configs: path.join(DATA_DIR, 'configs.json'),
  profiles: path.join(DATA_DIR, 'profiles.json'),
  providers: path.join(DATA_DIR, 'providers.json')
}

/**
 * Initialize data directory and default files
 */
async function initDataDir() {
  // Create directories
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.mkdir(CACHE_DIR, { recursive: true })

  // Initialize default data files if they don't exist
  const defaults = {
    configs: {
      configs: [
        {
          id: 'default',
          name: '默认配置',
          content: getDefaultConfigTemplate(),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    },
    profiles: {
      profiles: [
        {
          id: 'home',
          name: 'home',
          description: '家庭网络配置',
          createdAt: new Date().toISOString()
        },
        {
          id: 'office',
          name: 'office',
          description: '办公网络配置',
          createdAt: new Date().toISOString()
        }
      ]
    },
    providers: {
      providers: []
    }
  }

  for (const [key, defaultData] of Object.entries(defaults)) {
    try {
      await fs.access(FILES[key])
    } catch {
      await fs.writeFile(FILES[key], JSON.stringify(defaultData, null, 2))
      console.log(`Created default ${key}.json`)
    }
  }
}

/**
 * Read data from a JSON file
 */
async function readData(type) {
  const filePath = FILES[type]
  if (!filePath) {
    throw new Error(`Unknown data type: ${type}`)
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Write data to a JSON file
 */
async function writeData(type, data) {
  const filePath = FILES[type]
  if (!filePath) {
    throw new Error(`Unknown data type: ${type}`)
  }

  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

/**
 * Read provider cache
 */
async function readCache(providerId) {
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
async function writeCache(providerId, content) {
  const cachePath = path.join(CACHE_DIR, `${providerId}.yaml`)
  await fs.writeFile(cachePath, content)
}

/**
 * Get cache file modification time
 */
async function getCacheTime(providerId) {
  const cachePath = path.join(CACHE_DIR, `${providerId}.yaml`)
  try {
    const stats = await fs.stat(cachePath)
    return stats.mtime
  } catch {
    return null
  }
}

/**
 * Default Clash config template
 */
function getDefaultConfigTemplate() {
  return `# Clash Nexus 配置模板
# 使用 # @profile: xxx 标记特定场景的配置

port: 7890
socks-port: 7891
allow-lan: true
mode: rule
log-level: info

# DNS 配置
dns:
  enable: true
  enhanced-mode: fake-ip
  nameserver:
    - 223.5.5.5
    - 119.29.29.29

# 代理组
proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - DIRECT

# 规则
rules:
  # 公共规则
  - DOMAIN-SUFFIX,google.com,PROXY
  - DOMAIN-SUFFIX,github.com,PROXY
  
  # 家庭场景专属
  # @profile: home {
  - DOMAIN-SUFFIX,netflix.com,PROXY
  - DOMAIN-SUFFIX,youtube.com,PROXY
  # }
  
  # 办公场景专属
  # @profile: office {
  - DOMAIN-SUFFIX,company.com,DIRECT
  # }
  
  # 兜底规则
  - MATCH,DIRECT
`
}

module.exports = {
  initDataDir,
  readData,
  writeData,
  readCache,
  writeCache,
  getCacheTime,
  getDefaultConfigTemplate,
  DATA_DIR,
  CACHE_DIR
}
