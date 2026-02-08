import { getCacheTime, readCache, writeCache } from '../utils/fileStore.js'
import yaml from 'js-yaml'

/**
 * Get proxies from a URL provider
 * Used for inline providers in profiles
 * @param {string} url - Provider URL
 * @param {string} name - Provider name (for suffixing)
 * @param {number} interval - Cache validity in seconds (default 3600)
 */
export async function getProxiesFromProviderUrl(url, name, interval = 3600) {
  try {
    const content = await fetchProviderContent(url, interval)
    const proxies = extractProxiesFromYaml(content)

    return proxies.map(proxy => ({
      ...proxy,
      name: `${proxy.name} (${name})`
    }))
  } catch (error) {
    console.error(`Failed to get proxies from ${name} (${url}):`, error.message)
    return []
  }
}

/**
 * Fetch provider content with caching based on URL hash
 * @param {string} url - URL to fetch
 * @param {number} interval - Cache validity in seconds
 */
async function fetchProviderContent(url, interval) {
  // Use MD5 of URL as cache key
  const crypto = await import('crypto')
  const id = crypto.createHash('md5').update(url).digest('hex')

  // Check cache
  const cacheTime = await getCacheTime(id)
  const now = new Date()

  if (cacheTime) {
    const ageSeconds = (now - cacheTime) / 1000
    if (ageSeconds < interval) {
      // Cache is still valid
      const cached = await readCache(id)
      if (cached) return cached
    }
  }

  // Fetch new (cache expired or missing)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ClashNexus/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    await writeCache(id, content)
    return content
  } catch (error) {
    // If fetch failed but we have a (stale) cache, try to return it
    const cached = await readCache(id)
    if (cached) {
      console.warn(`Fetch failed for ${url}, returning stale cache`)
      return cached
    }
    throw error
  }
}

/**
 * Extract proxies from YAML content
 */
function extractProxiesFromYaml(content) {
  try {
    const parsed = yaml.load(content)
    return parsed?.proxies || []
  } catch (error) {
    console.error('Failed to parse YAML:', error.message)
    return []
  }
}
