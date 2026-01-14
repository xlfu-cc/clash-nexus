/**
 * Subscribe Service
 * Generates subscription content for Clash clients
 */
const yaml = require('js-yaml')
const configService = require('./configService')
const providerService = require('./providerService')
const { parseByProfile } = require('./yamlParser')

/**
 * Generate subscription content for a specific profile
 * @param {string} profile - Profile name
 * @returns {string} - YAML content for Clash
 */
async function generateSubscription(profile) {
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

  // Merge proxies from providers
  try {
    const providerProxies = await providerService.getAllProviderProxies()
    if (providerProxies.length > 0) {
      parsed.proxies = parsed.proxies || []
      parsed.proxies.push(...providerProxies)

      // Update proxy-groups to include new proxies
      if (parsed['proxy-groups']) {
        const proxyNames = providerProxies.map(p => p.name)

        for (const group of parsed['proxy-groups']) {
          // Add to groups that have a 'proxies' field (not url-based)
          if (group.proxies && Array.isArray(group.proxies)) {
            // Add after existing proxies but before special values like DIRECT/REJECT
            const specialValues = ['DIRECT', 'REJECT']
            const regularProxies = group.proxies.filter(p => !specialValues.includes(p))
            const specialProxies = group.proxies.filter(p => specialValues.includes(p))

            group.proxies = [...regularProxies, ...proxyNames, ...specialProxies]
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to merge provider proxies:', error.message)
    // Continue without provider proxies
  }

  // Convert back to YAML
  return yaml.dump(parsed, {
    indent: 2,
    lineWidth: -1, // Don't wrap lines
    noRefs: true
  })
}

module.exports = {
  generateSubscription
}
