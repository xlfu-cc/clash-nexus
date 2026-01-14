/**
 * Provider Service
 * Manages proxy providers (external subscription sources)
 */
const { v4: uuidv4 } = require('uuid')
const { readData, writeData, readCache, writeCache, getCacheTime } = require('../utils/fileStore')

/**
 * Get all providers
 */
async function getAllProviders() {
  const data = await readData('providers')
  return data?.providers || []
}

/**
 * Get provider by ID
 */
async function getProviderById(id) {
  const providers = await getAllProviders()
  return providers.find(p => p.id === id)
}

/**
 * Create new provider
 */
async function createProvider(name, url, interval = 3600) {
  const data = await readData('providers')
  const providers = data?.providers || []

  const newProvider = {
    id: uuidv4(),
    name,
    url,
    interval,
    lastUpdate: null,
    createdAt: new Date().toISOString()
  }

  providers.push(newProvider)
  await writeData('providers', { providers })

  // Fetch initial content
  await refreshProvider(newProvider.id)

  return newProvider
}

/**
 * Update provider
 */
async function updateProvider(id, updates) {
  const data = await readData('providers')
  const providers = data?.providers || []

  const index = providers.findIndex(p => p.id === id)
  if (index === -1) {
    throw new Error('Provider not found')
  }

  providers[index] = {
    ...providers[index],
    ...updates
  }

  await writeData('providers', { providers })
  return providers[index]
}

/**
 * Delete provider
 */
async function deleteProvider(id) {
  const data = await readData('providers')
  const providers = data?.providers || []

  const index = providers.findIndex(p => p.id === id)
  if (index === -1) {
    throw new Error('Provider not found')
  }

  providers.splice(index, 1)
  await writeData('providers', { providers })
}

/**
 * Refresh provider content from URL
 */
async function refreshProvider(id) {
  const provider = await getProviderById(id)
  if (!provider) {
    throw new Error('Provider not found')
  }

  try {
    const response = await fetch(provider.url, {
      headers: {
        'User-Agent': 'ClashNexus/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    await writeCache(id, content)

    // Update lastUpdate timestamp
    await updateProvider(id, { lastUpdate: new Date().toISOString() })

    return content
  } catch (error) {
    console.error(`Failed to refresh provider ${provider.name}:`, error.message)
    throw error
  }
}

/**
 * Get provider content (from cache or refresh if needed)
 */
async function getProviderContent(id) {
  const provider = await getProviderById(id)
  if (!provider) {
    throw new Error('Provider not found')
  }

  // Check if cache is still valid
  const cacheTime = await getCacheTime(id)
  const now = new Date()

  if (cacheTime) {
    const ageSeconds = (now - cacheTime) / 1000
    if (ageSeconds < provider.interval) {
      // Cache is still valid
      const cached = await readCache(id)
      if (cached) {
        return cached
      }
    }
  }

  // Cache expired or doesn't exist, refresh
  return await refreshProvider(id)
}

/**
 * Get all provider contents merged
 * Returns proxies extracted from all providers
 */
async function getAllProviderProxies() {
  const providers = await getAllProviders()
  const allProxies = []

  for (const provider of providers) {
    try {
      const content = await getProviderContent(provider.id)
      const proxies = extractProxiesFromYaml(content)
      allProxies.push(...proxies)
    } catch (error) {
      console.error(`Failed to get proxies from ${provider.name}:`, error.message)
    }
  }

  return allProxies
}

/**
 * Extract proxies from YAML content
 */
function extractProxiesFromYaml(content) {
  const yaml = require('js-yaml')

  try {
    const parsed = yaml.load(content)
    return parsed?.proxies || []
  } catch (error) {
    console.error('Failed to parse YAML:', error.message)
    return []
  }
}

module.exports = {
  getAllProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  refreshProvider,
  getProviderContent,
  getAllProviderProxies
}
