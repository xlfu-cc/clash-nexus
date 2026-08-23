import express from 'express'
import { authAdmin } from '../middleware/auth.js'
import * as providerService from '../services/providerService.js'

const router = express.Router()

// Apply admin auth to all routes
router.use(authAdmin)

/**
 * GET /api/providers
 * Get all managed providers
 */
router.get('/', async (req, res) => {
  try {
    const providers = await providerService.getAllProviders()
    res.json(providers)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/providers/:id
 * Get single provider details
 */
router.get('/:id', async (req, res) => {
  try {
    const provider = await providerService.getProviderById(req.params.id)
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }
    res.json(provider)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/providers
 * Create a new provider
 */
router.post('/', async (req, res) => {
  try {
    const { name, url, interval, type, path, healthCheck } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Provider name is required' })
    }
    if (!url) {
      return res.status(400).json({ error: 'Provider URL is required' })
    }

    const provider = await providerService.createProvider({
      name,
      url,
      interval,
      type,
      path,
      healthCheck
    })
    res.status(201).json(provider)
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/providers/:id
 * Update an existing provider
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, url, interval, type, path, healthCheck } = req.body

    const updates = {}
    if (name !== undefined) updates.name = name
    if (url !== undefined) updates.url = url
    if (interval !== undefined) updates.interval = interval
    if (type !== undefined) updates.type = type
    if (path !== undefined) updates.path = path
    if (healthCheck !== undefined) updates.healthCheck = healthCheck

    const provider = await providerService.updateProvider(req.params.id, updates)
    res.json(provider)
  } catch (error) {
    if (error.message === 'Provider not found') {
      return res.status(404).json({ error: error.message })
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/providers/:id
 * Delete a provider
 */
router.delete('/:id', async (req, res) => {
  try {
    await providerService.deleteProvider(req.params.id)
    res.status(204).send()
  } catch (error) {
    if (error.message === 'Provider not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/providers/:id/refresh
 * Force refresh a single provider
 */
router.post('/:id/refresh', async (req, res) => {
  try {
    const result = await providerService.refreshProvider(req.params.id, true)
    res.json(result)
  } catch (error) {
    if (error.message === 'Provider not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/providers/refresh
 * Force refresh all providers
 */
router.post('/refresh', async (req, res) => {
  try {
    const results = await providerService.refreshAllProviders(true)
    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
