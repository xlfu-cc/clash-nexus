import yaml from 'js-yaml'
import * as configService from './configService.js'
import * as providerService from './providerService.js'
import { parseByProfile } from './yamlParser.js'
import logger from '../utils/logger.js'

/**
 * Generate subscription content for a specific profile
 * @param {string} profile - Profile name
 * @param {object|boolean} options - Options object or forceRefresh boolean
 * @returns {string} - YAML content for Clash
 */
export async function generateSubscription(profile, options = {}) {
  const forceRefresh = typeof options === 'boolean' ? options : !!options?.forceRefresh

  // Get active config
  const config = await configService.getActiveConfig()
  if (!config) {
    throw new Error('No active configuration found')
  }

  // Parse config by profile
  let content = config.content
  if (profile) {
    content = parseByProfile(content, profile)
  }

  // Parse as YAML to merge with provider proxies
  let parsed
  try {
    parsed = yaml.load(content)
    if (!parsed || typeof parsed !== 'object') {
      parsed = {}
    }
  } catch (error) {
    throw new Error(`Invalid YAML configuration: ${error.message}`)
  }

  // Process proxy-providers (both managed and inline)
  try {
    const managedProviders = await providerService.getAllProviders()
    const allProviders = {}

    // Map managed providers
    for (const p of managedProviders) {
      if (p.name) {
        allProviders[p.name] = {
          name: p.name,
          url: p.url,
          interval: p.interval || 3600,
          type: p.type || 'http',
          id: p.id,
          managed: true
        }
      }
    }

    // Merge inline proxy-providers
    const inlineProviders = parsed['proxy-providers'] || {}
    for (const [name, p] of Object.entries(inlineProviders)) {
      if (p && typeof p === 'object') {
        if (allProviders[name]) {
          allProviders[name] = {
            ...allProviders[name],
            ...p,
            url: p.url || allProviders[name].url
          }
        } else if (p.url) {
          allProviders[name] = {
            name,
            url: p.url,
            interval: p.interval || 3600,
            type: p.type || 'http',
            managed: false
          }
        }
      }
    }

    // Find all referenced providers (defined in proxy-providers or used in proxy-groups)
    const referencedProviderNames = new Set(Object.keys(inlineProviders))

    if (Array.isArray(parsed['proxy-groups'])) {
      for (const group of parsed['proxy-groups']) {
        if (Array.isArray(group.use)) {
          for (const useName of group.use) {
            if (allProviders[useName]) {
              referencedProviderNames.add(useName)
            }
          }
        }
      }
    }

    if (referencedProviderNames.size > 0) {
      parsed.proxies = parsed.proxies || []
      const providerToProxies = {}

      // Fetch and expand all referenced providers
      for (const name of referencedProviderNames) {
        const provider = allProviders[name]
        if (provider && provider.type === 'http' && provider.url) {
          logger.info(`Processing provider: ${name} (managed=${!!provider.managed}, forceRefresh=${forceRefresh})`)
          const proxies = await providerService.getProxiesFromProviderUrl(provider.url, name, provider.interval, forceRefresh, provider.id)
          logger.debug(`Got ${proxies.length} proxies from provider ${name}`)

          if (proxies.length > 0) {
            parsed.proxies.push(...proxies)
            providerToProxies[name] = proxies.map(p => p.name)
          }
        }
      }

      // Update proxy-groups to expand provider references
      if (Array.isArray(parsed['proxy-groups'])) {
        for (const group of parsed['proxy-groups']) {
          if (Array.isArray(group.use)) {
            const expandedProxies = []
            const remainingUses = []

            for (const useName of group.use) {
              if (providerToProxies[useName]) {
                expandedProxies.push(...providerToProxies[useName])
              } else {
                remainingUses.push(useName)
              }
            }

            group.proxies = group.proxies || []
            group.proxies = [...group.proxies, ...expandedProxies]

            group.use = remainingUses
            if (group.use.length === 0) {
              delete group.use
            }
          }
        }
      }

      // Remove proxy-providers from output to avoid client re-fetching
      delete parsed['proxy-providers']
    }
  } catch (error) {
    logger.error(`Failed to process proxy providers: ${error.message}`)
    // Continue with partial results
  }

  // Convert back to YAML
  return yaml.dump(parsed, {
    indent: 2,
    lineWidth: -1, // Don't wrap lines
    noRefs: true
  })
}
