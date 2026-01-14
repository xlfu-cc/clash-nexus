/**
 * Config Service
 * Manages YAML configuration files
 */
const { v4: uuidv4 } = require('uuid')
const { readData, writeData } = require('../utils/fileStore')

/**
 * Get all configs
 */
async function getAllConfigs() {
  const data = await readData('configs')
  return data?.configs || []
}

/**
 * Get config by ID
 */
async function getConfigById(id) {
  const configs = await getAllConfigs()
  return configs.find(c => c.id === id)
}

/**
 * Get active config
 */
async function getActiveConfig() {
  const configs = await getAllConfigs()
  return configs.find(c => c.isActive) || configs[0]
}

/**
 * Create new config
 */
async function createConfig(name, content) {
  const data = await readData('configs')
  const configs = data?.configs || []

  const newConfig = {
    id: uuidv4(),
    name,
    content,
    isActive: configs.length === 0, // First config is active by default
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  configs.push(newConfig)
  await writeData('configs', { configs })

  return newConfig
}

/**
 * Update config
 */
async function updateConfig(id, updates) {
  const data = await readData('configs')
  const configs = data?.configs || []

  const index = configs.findIndex(c => c.id === id)
  if (index === -1) {
    throw new Error('Config not found')
  }

  configs[index] = {
    ...configs[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }

  await writeData('configs', { configs })
  return configs[index]
}

/**
 * Delete config
 */
async function deleteConfig(id) {
  const data = await readData('configs')
  const configs = data?.configs || []

  const index = configs.findIndex(c => c.id === id)
  if (index === -1) {
    throw new Error('Config not found')
  }

  const wasActive = configs[index].isActive
  configs.splice(index, 1)

  // If deleted config was active, make first remaining config active
  if (wasActive && configs.length > 0) {
    configs[0].isActive = true
  }

  await writeData('configs', { configs })
}

/**
 * Set config as active
 */
async function setActiveConfig(id) {
  const data = await readData('configs')
  const configs = data?.configs || []

  const targetIndex = configs.findIndex(c => c.id === id)
  if (targetIndex === -1) {
    throw new Error('Config not found')
  }

  // Deactivate all, activate target
  configs.forEach((c, i) => {
    c.isActive = i === targetIndex
  })

  await writeData('configs', { configs })
  return configs[targetIndex]
}

module.exports = {
  getAllConfigs,
  getConfigById,
  getActiveConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  setActiveConfig
}
