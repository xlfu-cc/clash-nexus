import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import yaml from 'js-yaml'
import { getCacheTime, readCache, writeCache, deleteCache, readData, updateData } from '../utils/fileStore.js'
import logger from '../utils/logger.js'

// ============ Provider CRUD Functions ============

/**
 * Get all managed providers
 */
export async function getAllProviders() {
  const data = await readData('providers')
  return data?.providers || []
}

/**
 * Get provider by ID
 */
export async function getProviderById(id) {
  const providers = await getAllProviders()
  return providers.find(p => p.id === id)
}

/**
 * Get provider by Name
 */
export async function getProviderByName(name) {
  const providers = await getAllProviders()
  return providers.find(p => p.name.toLowerCase() === name.toLowerCase())
}

/**
 * Create a new provider
 */
export async function createProvider(data) {
  const { name, url, interval = 3600, type = 'http', path, healthCheck } = data

  if (!name || !name.trim()) {
    throw new Error('Provider name is required')
  }
  if (!url || !url.trim()) {
    throw new Error('Provider URL is required')
  }

  // Check unique name
  const existing = await getProviderByName(name.trim())
  if (existing) {
    throw new Error(`Provider with name "${name.trim()}" already exists`)
  }

  let createdProvider

  await updateData('providers', currentData => {
    const providers = currentData?.providers || []

    createdProvider = {
      id: uuidv4(),
      name: name.trim(),
      url: url.trim(),
      type: type || 'http',
      interval: Number(interval) || 3600,
      path: path ? path.trim() : `./providers/${name.trim()}.yaml`,
      healthCheck: healthCheck || {
        enable: true,
        interval: 600,
        url: 'http://www.gstatic.com/generate_204'
      },
      status: 'unfetched',
      proxyCount: 0,
      lastRefreshedAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    providers.push(createdProvider)
    return { ...currentData, providers }
  })

  logger.info(`Provider created: ${createdProvider.name} (${createdProvider.id})`)

  // Background refresh to fetch initial proxies
  refreshProvider(createdProvider.id, true).catch(err => {
    logger.warn(`Initial fetch for provider ${createdProvider.name} failed: ${err.message}`)
  })

  return createdProvider
}

/**
 * Update an existing provider
 */
export async function updateProvider(id, updates) {
  let updatedProvider

  await updateData('providers', currentData => {
    const providers = currentData?.providers || []
    const provider = providers.find(p => p.id === id)

    if (!provider) {
      throw new Error('Provider not found')
    }

    if (updates.name && updates.name.trim().toLowerCase() !== provider.name.toLowerCase()) {
      const duplicate = providers.find(p => p.id !== id && p.name.toLowerCase() === updates.name.trim().toLowerCase())
      if (duplicate) {
        throw new Error(`Provider with name "${updates.name.trim()}" already exists`)
      }
      provider.name = updates.name.trim()
    }

    if (updates.url !== undefined) {
      provider.url = updates.url.trim()
    }

    if (updates.interval !== undefined) {
      provider.interval = Number(updates.interval) || 3600
    }

    if (updates.type !== undefined) {
      provider.type = updates.type
    }

    if (updates.path !== undefined) {
      provider.path = updates.path
    }

    if (updates.healthCheck !== undefined) {
      provider.healthCheck = updates.healthCheck
    }

    provider.updatedAt = new Date().toISOString()
    updatedProvider = provider

    return { ...currentData, providers }
  })

  logger.info(`Provider updated: ${updatedProvider.name} (${id})`)
  return updatedProvider
}

/**
 * Delete a provider
 */
export async function deleteProvider(id) {
  let deletedProvider

  await updateData('providers', currentData => {
    let providers = currentData?.providers || []
    deletedProvider = providers.find(p => p.id === id)

    if (!deletedProvider) {
      throw new Error('Provider not found')
    }

    providers = providers.filter(p => p.id !== id)
    return { ...currentData, providers }
  })

  if (deletedProvider?.url) {
    const cacheKey = crypto.createHash('md5').update(deletedProvider.url).digest('hex')
    await deleteCache(cacheKey)
  }

  logger.info(`Provider deleted: ${id}`)
  return deletedProvider
}

// ============ Proxy Fetching & Caching ============

/**
 * Get proxies from a URL provider
 * @param {string} url - Provider URL
 * @param {string} name - Provider name (for suffixing)
 * @param {number} interval - Cache validity in seconds (default 3600)
 * @param {boolean} forceRefresh - Force bypass cache and refetch
 * @param {string} providerId - Optional provider ID to update status
 */
export async function getProxiesFromProviderUrl(url, name, interval = 3600, forceRefresh = false, providerId = null) {
  try {
    const content = await fetchProviderContent(url, interval, forceRefresh)
    const proxies = extractProxiesFromYaml(content)

    const formattedProxies = proxies
      .filter(p => p && typeof p === 'object')
      .map(proxy => ({
        ...proxy,
        name: proxy.name ? `${proxy.name} (${name})` : `Node (${name})`
      }))

    if (providerId) {
      await updateProviderStatus(providerId, 'ok', formattedProxies.length, null)
    }

    return formattedProxies
  } catch (error) {
    logger.error(`Failed to get proxies from ${name} (${url}): ${error.message}`)
    if (providerId) {
      await updateProviderStatus(providerId, 'error', 0, error.message)
    }
    return []
  }
}

/**
 * Update provider status and proxy count in data store
 */
async function updateProviderStatus(id, status, proxyCount, errorMessage = null) {
  try {
    await updateData('providers', currentData => {
      const providers = currentData?.providers || []
      const provider = providers.find(p => p.id === id)
      if (provider) {
        provider.status = status
        if (status === 'ok') {
          provider.proxyCount = proxyCount
          provider.lastRefreshedAt = new Date().toISOString()
          provider.lastError = null
        } else {
          provider.lastError = errorMessage
        }
      }
      return { ...currentData, providers }
    })
  } catch (err) {
    logger.error(`Failed to update provider status for ${id}: ${err.message}`)
  }
}

/**
 * Fetch provider content with caching based on URL hash
 * @param {string} url - URL to fetch
 * @param {number} interval - Cache validity in seconds
 * @param {boolean} forceRefresh - Force refetch from remote
 */
async function fetchProviderContent(url, interval, forceRefresh = false) {
  const cacheKey = crypto.createHash('md5').update(url).digest('hex')

  // Check cache unless forceRefresh is true
  if (!forceRefresh) {
    const cacheTime = await getCacheTime(cacheKey)
    const now = new Date()

    if (cacheTime) {
      const ageSeconds = (now - cacheTime) / 1000
      if (ageSeconds < interval) {
        // Cache is still valid
        const cached = await readCache(cacheKey)
        if (cached) return cached
      }
    }
  }

  // Fetch from remote
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ClashNexus/1.0 (Clash Provider Fetcher)'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    await writeCache(cacheKey, content)
    return content
  } catch (error) {
    // If fetch failed but we have a stale cache, return it if available
    const cached = await readCache(cacheKey)
    if (cached) {
      logger.warn(`Fetch failed for ${url} (${error.message}), returning stale cache`)
      return cached
    }
    throw error
  }
}

/**
 * Extract proxies from YAML content (or base64 encoded content)
 */
export function extractProxiesFromYaml(content) {
  if (!content || typeof content !== 'string') {
    return []
  }

  const text = content.trim()

  // First try parsing directly as YAML
  try {
    const parsed = yaml.load(text)
    if (parsed && Array.isArray(parsed.proxies)) {
      return parsed.proxies
    }
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // ignore and try base64 below
  }

  // Try base64 decoding
  try {
    const decoded = Buffer.from(text, 'base64').toString('utf-8')
    if (decoded && decoded !== text) {
      const parsedDecoded = yaml.load(decoded)
      if (parsedDecoded && Array.isArray(parsedDecoded.proxies)) {
        return parsedDecoded.proxies
      }
      if (Array.isArray(parsedDecoded)) {
        return parsedDecoded
      }
    }
  } catch (err) {
    logger.debug(`Failed to decode base64 provider content: ${err.message}`)
  }

  return []
}

/**
 * Force refresh a single provider by ID
 * @param {string} id - Provider ID
 * @param {boolean} force - Force refetch
 */
export async function refreshProvider(id, force = true) {
  const provider = await getProviderById(id)
  if (!provider) {
    throw new Error('Provider not found')
  }

  try {
    const proxies = await getProxiesFromProviderUrl(provider.url, provider.name, provider.interval, force, provider.id)

    const updated = await getProviderById(id)
    return {
      success: true,
      provider: updated,
      proxyCount: proxies.length
    }
  } catch (error) {
    await updateProviderStatus(id, 'error', 0, error.message)
    const updated = await getProviderById(id)
    return {
      success: false,
      provider: updated,
      error: error.message
    }
  }
}

/**
 * Force refresh all managed providers
 * @param {boolean} force - Force refetch
 */
export async function refreshAllProviders(force = true) {
  const providers = await getAllProviders()
  const results = []

  for (const provider of providers) {
    try {
      const res = await refreshProvider(provider.id, force)
      results.push(res)
    } catch (err) {
      results.push({
        success: false,
        id: provider.id,
        name: provider.name,
        error: err.message
      })
    }
  }

  return results
}
