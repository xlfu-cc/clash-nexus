/**
 * Profile Routes
 * CRUD operations for profiles
 */
const express = require('express')
const router = express.Router()
const { authAdmin } = require('../middleware/auth')
const profileService = require('../services/profileService')

// Apply admin auth to all routes
router.use(authAdmin)

/**
 * GET /api/profiles
 * Get all profiles
 */
router.get('/', async (req, res) => {
  try {
    const profiles = await profileService.getAllProfiles()
    res.json(profiles)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/profiles/:id
 * Get single profile
 */
router.get('/:id', async (req, res) => {
  try {
    const profile = await profileService.getProfile(req.params.id)
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    res.json(profile)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/profiles
 * Create new profile
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Validate name format (alphanumeric and underscore only)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return res.status(400).json({
        error:
          'Profile name must start with a letter and contain only letters, numbers, and underscores'
      })
    }

    const profile = await profileService.createProfile(name, description)
    res.status(201).json(profile)
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/profiles/:id
 * Update profile
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body

    // Validate name format if provided
    if (name && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return res.status(400).json({
        error:
          'Profile name must start with a letter and contain only letters, numbers, and underscores'
      })
    }

    const updates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description

    const profile = await profileService.updateProfile(req.params.id, updates)
    res.json(profile)
  } catch (error) {
    if (error.message === 'Profile not found') {
      return res.status(404).json({ error: error.message })
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/profiles/:id
 * Delete profile
 */
router.delete('/:id', async (req, res) => {
  try {
    await profileService.deleteProfile(req.params.id)
    res.status(204).send()
  } catch (error) {
    if (error.message === 'Profile not found') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
