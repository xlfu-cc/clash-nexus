/**
 * Provider Routes
 * CRUD operations for proxy providers
 */
const express = require('express')
const router = express.Router()
const { authAdmin } = require('../middleware/auth')
const providerService = require('../services/providerService')

// Apply admin auth to all routes
router.use(authAdmin)

/**
 * GET /api/providers
 * Get all providers
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
 * Get single provider
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
 * Create new provider
 */
router.post('/', async (req, res) => {
  try {
    const { name, url, interval } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' })
    }

    // Validate interval (minimum 300 seconds = 5 minutes)
    const parsedInterval = parseInt(interval) || 3600
    if (parsedInterval < 300) {
      return res.status(400).json({ error: 'Interval must be at least 300 seconds' })
    }

    const provider = await providerService.createProvider(name, url, parsedInterval)
    res.status(201).json(provider)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/providers/:id
 * Update provider
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, url, interval } = req.body

    // Validate URL format if provided
    if (url) {
      try {
        new URL(url)
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' })
      }
    }

    // Validate interval if provided
    if (interval !== undefined) {
      const parsedInterval = parseInt(interval)
      if (parsedInterval < 300) {
        return res.status(400).json({ error: 'Interval must be at least 300 seconds' })
      }
    }

    const updates = {}
    if (name !== undefined) updates.name = name
    if (url !== undefined) updates.url = url
    if (interval !== undefined) updates.interval = parseInt(interval)

    const provider = await providerService.updateProvider(req.params.id, updates)
    res.json(provider)
  } catch (error) {
    if (error.message === 'Provider not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/providers/:id
 * Delete provider
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
 * Force refresh provider content
 */
router.post('/:id/refresh', async (req, res) => {
  try {
    await providerService.refreshProvider(req.params.id)
    const provider = await providerService.getProviderById(req.params.id)
    res.json({
      message: 'Provider refreshed successfully',
      provider
    })
  } catch (error) {
    if (error.message === 'Provider not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
