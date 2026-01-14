/**
 * Subscribe Route
 * Handles Clash subscription requests
 */
const express = require('express')
const router = express.Router()
const { authSubscribe } = require('../middleware/auth')
const subscribeService = require('../services/subscribeService')

/**
 * GET /subscribe
 * Get subscription content for Clash
 * Query params:
 *   - profile: Profile name (optional)
 *   - token: Subscribe token (required if configured)
 */
router.get('/', authSubscribe, async (req, res) => {
  try {
    const { profile } = req.query

    const content = await subscribeService.generateSubscription(profile)

    // Set headers for Clash
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="clash-config.yaml"')
    res.setHeader('Profile-Update-Interval', '24') // Hours

    res.send(content)
  } catch (error) {
    console.error('Subscribe error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
