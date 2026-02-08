import { v4 as uuidv4 } from 'uuid'
import { readData, updateData } from '../utils/fileStore.js'
import logger from '../utils/logger.js'

/**
 * Get all configs
 */
export async function getAllConfigs() {
  const data = await readData('configs')
  return data?.configs || []
}

/**
 * Get config by ID
 */
export async function getConfigById(id) {
  const configs = await getAllConfigs()
  return configs.find(c => c.id === id)
}

/**
 * Get active config
 */
export async function getActiveConfig() {
  const configs = await getAllConfigs()
  return configs.find(c => c.isActive) || configs[0]
}

/**
 * Create new config
 */
export async function createConfig(name, content) {
  let createdConfig

  await updateData('configs', data => {
    const configs = data?.configs || []

    createdConfig = {
      id: uuidv4(),
      name,
      content,
      isActive: configs.length === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    configs.push(createdConfig)
    return { ...data, configs }
  })

  logger.info(`Config created: ${name} (${createdConfig.id})`)
  return createdConfig
}

/**
 * Update config
 */
export async function updateConfig(id, updates) {
  let updatedConfig

  await updateData('configs', data => {
    const configs = data?.configs || []
    const config = configs.find(c => c.id === id)

    if (!config) {
      throw new Error('Config not found')
    }

    Object.assign(config, updates, {
      updatedAt: new Date().toISOString()
    })

    updatedConfig = config
    return { ...data, configs }
  })

  logger.info(`Config updated: ${updatedConfig.name} (${id})`)
  return updatedConfig
}

/**
 * Delete config
 */
export async function deleteConfig(id) {
  await updateData('configs', data => {
    let configs = data?.configs || []
    const configToDelete = configs.find(c => c.id === id)

    if (!configToDelete) {
      throw new Error('Config not found')
    }

    const wasActive = configToDelete.isActive
    configs = configs.filter(c => c.id !== id)

    if (wasActive && configs.length > 0) {
      configs[0].isActive = true
    }

    return { ...data, configs }
  })
  logger.info(`Config deleted: ${id}`)
}

/**
 * Set config as active
 */
export async function setActiveConfig(id) {
  let activeConfig

  await updateData('configs', data => {
    const configs = data?.configs || []
    let found = false

    configs.forEach(c => {
      if (c.id === id) {
        c.isActive = true
        activeConfig = c
        found = true
      } else {
        c.isActive = false
      }
    })

    if (!found) {
      throw new Error('Config not found')
    }

    return { ...data, configs }
  })

  logger.info(`Config activated: ${activeConfig.name} (${id})`)
  return activeConfig
}
