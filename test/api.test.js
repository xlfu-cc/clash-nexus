import assert from 'assert'
import express from 'express'
import cors from 'cors'
import * as fileStore from '../server/utils/fileStore.js'
import * as authService from '../server/services/authService.js'
import * as providerService from '../server/services/providerService.js'
import * as configService from '../server/services/configService.js'
import providerRoutes from '../server/routes/provider.js'
import subscribeRoutes from '../server/routes/subscribe.js'
import configRoutes from '../server/routes/config.js'

async function runApiTests() {
  console.log('🧪 Starting Clash Nexus API Integration Tests...\n')

  await fileStore.initDataDir()

  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/providers', providerRoutes)
  app.use('/api/subscribe', subscribeRoutes)
  app.use('/api/configs', configRoutes)

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  // Login/token setup
  const adminToken = 'test-admin-token-12345'
  global.ADMIN_SESSIONS = global.ADMIN_SESSIONS || new Set()
  global.ADMIN_SESSIONS.add(adminToken)
  const subscribeToken = await authService.getSubscribeToken()

  // Save original active config to restore later
  const originalActive = await configService.getActiveConfig()

  try {
    // 1. GET /api/providers without auth -> 401
    console.log('▶ API Test 1: GET /api/providers unauthorized')
    const resUnauth = await fetch(`${baseUrl}/api/providers`)
    assert.strictEqual(resUnauth.status, 401, 'Should return 401 Unauthorized')
    console.log('  ✅ API Test 1 passed: auth protection working')

    // 2. POST /api/providers -> create provider
    console.log('▶ API Test 2: POST /api/providers create provider')
    const resCreate = await fetch(`${baseUrl}/api/providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'api-test-provider',
        url: 'http://127.0.0.1:9999/mock-provider-2.yaml',
        interval: 1200
      })
    })
    assert.strictEqual(resCreate.status, 201, 'Should return 201 Created')
    const createdData = await resCreate.json()
    assert.strictEqual(createdData.name, 'api-test-provider')
    assert.ok(createdData.id)
    console.log('  ✅ API Test 2 passed: provider created via API')

    // 3. GET /api/providers -> list providers
    console.log('▶ API Test 3: GET /api/providers list')
    const resList = await fetch(`${baseUrl}/api/providers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.strictEqual(resList.status, 200)
    const listData = await resList.json()
    assert.ok(listData.some(p => p.id === createdData.id))
    console.log('  ✅ API Test 3 passed: provider listed via API')

    // 4. PUT /api/providers/:id -> update provider
    console.log('▶ API Test 4: PUT /api/providers/:id update')
    const resUpdate = await fetch(`${baseUrl}/api/providers/${createdData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        interval: 2400
      })
    })
    assert.strictEqual(resUpdate.status, 200)
    const updatedData = await resUpdate.json()
    assert.strictEqual(updatedData.interval, 2400)
    console.log('  ✅ API Test 4 passed: provider updated via API')

    // 5. Seed cache for mock provider
    const crypto = await import('crypto')
    const cacheKey = crypto.createHash('md5').update('http://127.0.0.1:9999/mock-provider-2.yaml').digest('hex')
    const mockYaml = `
proxies:
  - name: hk-01
    type: ss
    server: 8.8.8.8
    port: 10086
`
    await fileStore.writeCache(cacheKey, mockYaml)

    // 6. POST /api/providers/:id/refresh -> refresh single provider
    console.log('▶ API Test 6: POST /api/providers/:id/refresh')
    const resRefreshSingle = await fetch(`${baseUrl}/api/providers/${createdData.id}/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.strictEqual(resRefreshSingle.status, 200)
    const refreshData = await resRefreshSingle.json()
    assert.strictEqual(refreshData.success, true)
    assert.strictEqual(refreshData.proxyCount, 1)
    console.log('  ✅ API Test 6 passed: single provider refreshed via API')

    // 7. POST /api/providers/refresh -> refresh all providers
    console.log('▶ API Test 7: POST /api/providers/refresh')
    const resRefreshAll = await fetch(`${baseUrl}/api/providers/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.strictEqual(resRefreshAll.status, 200)
    const refreshAllData = await resRefreshAll.json()
    assert.strictEqual(refreshAllData.success, true)
    assert.ok(Array.isArray(refreshAllData.results))
    console.log('  ✅ API Test 7 passed: all providers refreshed via API')

    // 8. GET /api/subscribe/:token?refresh=1 -> test subscription route with forceRefresh query parameter
    console.log('▶ API Test 8: GET /api/subscribe/:token?refresh=1')
    const testConfig = await configService.createConfig('API Test Subscription', `
port: 7890
mode: rule
proxy-groups:
  - name: PROXY
    type: select
    use:
      - api-test-provider
rules:
  - MATCH,PROXY
`)
    await configService.setActiveConfig(testConfig.id)

    const resSub = await fetch(`${baseUrl}/api/subscribe/${subscribeToken}?refresh=1`)
    assert.strictEqual(resSub.status, 200)
    assert.strictEqual(resSub.headers.get('content-type'), 'text/yaml; charset=utf-8')
    const subContent = await resSub.text()
    assert.ok(subContent.includes('port:'))
    assert.ok(subContent.includes('hk-01 (api-test-provider)'))
    console.log('  ✅ API Test 8 passed: subscription generated with ?refresh=1 and expanded provider')

    // Clean up test config
    await configService.deleteConfig(testConfig.id)
    if (originalActive) {
      await configService.setActiveConfig(originalActive.id)
    }

    // 9. DELETE /api/providers/:id -> delete provider
    console.log('▶ API Test 9: DELETE /api/providers/:id')
    const resDelete = await fetch(`${baseUrl}/api/providers/${createdData.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.strictEqual(resDelete.status, 204)
    console.log('  ✅ API Test 9 passed: provider deleted via API')

    await fileStore.deleteCache(cacheKey)

    console.log('\n🎉 ALL API INTEGRATION TESTS PASSED! ✨')
  } finally {
    server.close()
  }
}

runApiTests().catch(err => {
  console.error('\n❌ API Test failed with error:', err)
  process.exit(1)
})
