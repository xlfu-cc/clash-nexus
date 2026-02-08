import yaml from 'js-yaml'
import * as configService from './configService.js'
import * as providerService from './providerService.js'
import { parseByProfile } from './yamlParser.js'
import logger from '../utils/logger.js'

/**
 * Generate subscription content for a specific profile
 * @param {string} profile - Profile name
 * @returns {string} - YAML content for Clash
 */
export async function generateSubscription(profile) {
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
  } catch (error) {
    throw new Error(`Invalid YAML configuration: ${error.message}`)
  }

  // Process inline proxy-providers
  try {
    const proxyProviders = parsed['proxy-providers'] || {}
    const providerNames = Object.keys(proxyProviders)

    if (providerNames.length > 0) {
      parsed.proxies = parsed.proxies || []

      // Map to track which provider provided which proxies
      const providerToProxies = {}

      // Fetch and expand all providers
      for (const name of providerNames) {
        const provider = proxyProviders[name]
        if (provider.type === 'http' && provider.url) {
          logger.info(`Processing inline provider: ${name}`)
          const proxies = await providerService.getProxiesFromProviderUrl(provider.url, name, provider.interval)
          logger.debug(`Got ${proxies.length} proxies from ${name}`)

          if (proxies.length > 0) {
            parsed.proxies.push(...proxies)
            providerToProxies[name] = proxies.map(p => p.name)
          }
        }
      }

      // Update proxy-groups to expand provider references
      if (parsed['proxy-groups']) {
        for (const group of parsed['proxy-groups']) {
          if (group.use && Array.isArray(group.use)) {
            // Expand 'use' fields
            const expandedProxies = []
            const remainingUses = []

            for (const useName of group.use) {
              if (providerToProxies[useName]) {
                expandedProxies.push(...providerToProxies[useName])
              } else {
                remainingUses.push(useName)
              }
            }

            // Update group proxies
            group.proxies = group.proxies || []
            group.proxies = [...group.proxies, ...expandedProxies]

            // Update uses (keep valid ones that weren't expanded found in providers)
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
    logger.error(`Failed to process inline providers: ${error.message}`)
    // Continue with partial results
  }

  // Convert back to YAML
  return yaml.dump(parsed, {
    indent: 2,
    lineWidth: -1, // Don't wrap lines
    noRefs: true
  })
}
