import assert from 'assert'
import fs from 'fs/promises'
import path from 'path'
import * as fileStore from '../server/utils/fileStore.js'
import * as providerService from '../server/services/providerService.js'
import * as subscribeService from '../server/services/subscribeService.js'
import * as configService from '../server/services/configService.js'

async function runTests() {
  console.log('🧪 Starting Clash Nexus Proxy Provider & Force Refresh Tests...\n')

  await fileStore.initDataDir()

  // Test 1: Extract Proxies from YAML
  console.log('▶ Test 1: extractProxiesFromYaml')
  const sampleYaml = `
proxies:
  - name: node-1
    type: ss
    server: 1.1.1.1
    port: 8388
  - name: node-2
    type: vmess
    server: 2.2.2.2
    port: 443
`
  const extracted = providerService.extractProxiesFromYaml(sampleYaml)
  assert.strictEqual(extracted.length, 2, 'Should extract 2 proxies from standard YAML')
  assert.strictEqual(extracted[0].name, 'node-1')
  console.log('  ✅ Test 1 passed: extracted proxies from standard YAML')

  // Test 2: Extract Proxies from Base64 encoded YAML
  console.log('▶ Test 2: extractProxiesFromYaml (Base64)')
  const base64Content = Buffer.from(sampleYaml).toString('base64')
  const extractedBase64 = providerService.extractProxiesFromYaml(base64Content)
  assert.strictEqual(extractedBase64.length, 2, 'Should extract 2 proxies from base64 encoded YAML')
  console.log('  ✅ Test 2 passed: extracted proxies from base64 YAML')

  // Test 3: Provider CRUD in Data Store
  console.log('▶ Test 3: Provider CRUD operations')
  const initialProviders = await providerService.getAllProviders()

  // Clean up any old test providers
  for (const p of initialProviders) {
    if (p.name.startsWith('test-')) {
      await providerService.deleteProvider(p.id)
    }
  }

  const created = await providerService.createProvider({
    name: 'test-airport',
    url: 'https://raw.githubusercontent.com/test/airport.yaml',
    interval: 1800
  })
  assert.ok(created.id, 'Provider should have an ID')
  assert.strictEqual(created.name, 'test-airport')
  assert.strictEqual(created.interval, 1800)

  const fetched = await providerService.getProviderById(created.id)
  assert.strictEqual(fetched.name, 'test-airport')

  const fetchedByName = await providerService.getProviderByName('test-airport')
  assert.strictEqual(fetchedByName.id, created.id)

  const updated = await providerService.updateProvider(created.id, {
    name: 'test-airport-updated',
    interval: 7200
  })
  assert.strictEqual(updated.name, 'test-airport-updated')
  assert.strictEqual(updated.interval, 7200)

  // Test duplicate name prevention
  let dupError = false
  try {
    await providerService.createProvider({
      name: 'test-airport-updated',
      url: 'https://other.com'
    })
  } catch (err) {
    dupError = true
  }
  assert.ok(dupError, 'Should prevent duplicate provider names')

  console.log('  ✅ Test 3 passed: CRUD & duplicate checks working')

  // Test 4: Mock Provider Caching and Force Refresh
  console.log('▶ Test 4: Provider Cache & Force Refresh')
  const crypto = await import('crypto')
  const testUrl = 'http://127.0.0.1:9999/mock-provider.yaml'
  const testCacheKey = crypto.createHash('md5').update(testUrl).digest('hex')

  const mockProviderYaml = `
proxies:
  - name: mock-node-alpha
    type: ss
    server: 3.3.3.3
    port: 8888
  - name: mock-node-beta
    type: ss
    server: 4.4.4.4
    port: 8888
`
  // Write cache directly
  await fileStore.writeCache(testCacheKey, mockProviderYaml)

  // Read with cache
  const proxiesCached = await providerService.getProxiesFromProviderUrl(testUrl, 'mock-source', 3600, false)
  assert.strictEqual(proxiesCached.length, 2, 'Should get 2 proxies from cache')
  assert.strictEqual(proxiesCached[0].name, 'mock-node-alpha (mock-source)')
  assert.strictEqual(proxiesCached[1].name, 'mock-node-beta (mock-source)')
  console.log('  ✅ Test 4 passed: cached provider proxies correctly parsed and named')

  // Test 5: Subscription Generation with Managed Provider References in proxy-groups.use
  console.log('▶ Test 5: Subscription generation referencing managed provider')
  // Create managed provider 'test-managed'
  const managedProvider = await providerService.createProvider({
    name: 'test-managed',
    url: testUrl,
    interval: 3600
  })

  // Create test config that uses 'test-managed' in proxy-groups
  const testConfigYaml = `
port: 7890
mode: rule
proxies:
  - name: direct-node
    type: direct

proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - DIRECT
    use:
      - test-managed

rules:
  - MATCH,PROXY
`
  const testConfig = await configService.createConfig('Test Subscription Config', testConfigYaml)
  await configService.setActiveConfig(testConfig.id)

  const subYaml = await subscribeService.generateSubscription()
  const yaml = (await import('js-yaml')).default
  const parsedSub = yaml.load(subYaml)

  // Verify proxy-providers is stripped
  assert.strictEqual(parsedSub['proxy-providers'], undefined, 'proxy-providers should be removed from output')

  // Verify proxies includes both direct-node and the 2 provider nodes
  assert.ok(parsedSub.proxies.find(p => p.name === 'direct-node'), 'Should retain direct-node')
  assert.ok(parsedSub.proxies.find(p => p.name === 'mock-node-alpha (test-managed)'), 'Should include expanded mock-node-alpha')
  assert.ok(parsedSub.proxies.find(p => p.name === 'mock-node-beta (test-managed)'), 'Should include expanded mock-node-beta')

  // Verify PROXY group contains DIRECT and the 2 provider nodes, and use is removed
  const proxyGroup = parsedSub['proxy-groups'].find(g => g.name === 'PROXY')
  assert.ok(proxyGroup, 'PROXY group should exist')
  assert.ok(proxyGroup.proxies.includes('DIRECT'), 'PROXY group should include DIRECT')
  assert.ok(proxyGroup.proxies.includes('mock-node-alpha (test-managed)'), 'PROXY group should include expanded node 1')
  assert.ok(proxyGroup.proxies.includes('mock-node-beta (test-managed)'), 'PROXY group should include expanded node 2')
  assert.strictEqual(proxyGroup.use, undefined, 'use field should be removed after expansion')

  console.log('  ✅ Test 5 passed: Managed provider successfully expanded in subscription without YAML proxy-providers definition')

  // Test 6: Clean up test fixtures
  console.log('▶ Test 6: Clean up test fixtures')
  await providerService.deleteProvider(created.id)
  await providerService.deleteProvider(managedProvider.id)
  await configService.deleteConfig(testConfig.id)
  await fileStore.deleteCache(testCacheKey)
  console.log('  ✅ Test 6 passed: Clean up completed')

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! ✨')
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err)
  process.exit(1)
})
