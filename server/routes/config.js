import express from 'express'
import { authAdmin } from '../middleware/auth.js'
import * as configService from '../services/configService.js'
import { extractProfiles, validateSyntax } from '../services/yamlParser.js'

const router = express.Router()

// Apply admin auth to all routes
router.use(authAdmin)

/**
 * GET /api/configs/profiles
 * Get all profile names defined in the active configuration
 */
router.get('/profiles', async (req, res) => {
  try {
    const config = await configService.getActiveConfig()
    if (!config) {
      return res.json([])
    }
    const profiles = extractProfiles(config.content)
    res.json(profiles)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/configs
 * Get all configurations
 */
router.get('/', async (req, res) => {
  try {
    const configs = await configService.getAllConfigs()
    // Return configs without full content for list view
    const list = configs.map(c => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }))
    res.json(list)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/configs/:id
 * Get single configuration with content
 */
router.get('/:id', async (req, res) => {
  try {
    const config = await configService.getConfigById(req.params.id)
    if (!config) {
      return res.status(404).json({ error: 'Config not found' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/configs
 * Create new configuration
 */
router.post('/', async (req, res) => {
  try {
    const { name, content } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Validate YAML syntax if content provided
    if (content) {
      const validation = validateSyntax(content)
      if (!validation.valid) {
        return res.status(400).json({ error: `Invalid YAML: ${validation.error}` })
      }
    }

    const config = await configService.createConfig(name, content || '')
    res.status(201).json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/configs/:id
 * Update configuration
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, content } = req.body

    // Validate YAML syntax if content is being updated
    if (content !== undefined) {
      const validation = validateSyntax(content)
      if (!validation.valid) {
        return res.status(400).json({ error: `Invalid YAML: ${validation.error}` })
      }
    }

    const updates = {}
    if (name !== undefined) updates.name = name
    if (content !== undefined) updates.content = content

    const config = await configService.updateConfig(req.params.id, updates)
    res.json(config)
  } catch (error) {
    if (error.message === 'Config not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/configs/:id
 * Delete configuration
 */
router.delete('/:id', async (req, res) => {
  try {
    await configService.deleteConfig(req.params.id)
    res.status(204).send()
  } catch (error) {
    if (error.message === 'Config not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/configs/:id/activate
 * Set configuration as active
 */
router.put('/:id/activate', async (req, res) => {
  try {
    const config = await configService.setActiveConfig(req.params.id)
    res.json(config)
  } catch (error) {
    if (error.message === 'Config not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router
