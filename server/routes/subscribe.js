import express from 'express'
import { authAdmin, authSubscribe } from '../middleware/auth.js'
import * as authService from '../services/authService.js'
import * as subscribeService from '../services/subscribeService.js'
import logger from '../utils/logger.js'

const router = express.Router()

/**
 * GET /subscribe/token
 * Get current subscribe token (admin only)
 */
router.get('/token', authAdmin, async (req, res) => {
  try {
    const token = await authService.getSubscribeToken()
    res.json({ token })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /subscribe/token/rotate
 * Rotate subscribe token (admin only)
 */
router.post('/token/rotate', authAdmin, async (req, res) => {
  try {
    const token = await authService.rotateSubscribeToken()
    res.json({ token })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /subscribe/:token
 * Get subscription content for Clash
 * Query params:
 *   - profile: Profile name (optional)
 *   - refresh / force: Force refresh providers (optional, e.g. ?refresh=1)
 */
router.get('/:token', authSubscribe, async (req, res) => {
  try {
    const { profile, refresh, force, forceRefresh } = req.query
    const shouldForceRefresh = refresh === '1' || refresh === 'true' || force === '1' || force === 'true' || forceRefresh === '1' || forceRefresh === 'true'

    const ip = req.ip || req.connection.remoteAddress
    logger.info(`Subscription request: profile=${profile || 'default'} forceRefresh=${shouldForceRefresh} from=${ip}`)

    const content = await subscribeService.generateSubscription(profile, {
      forceRefresh: shouldForceRefresh
    })

    res.setHeader('Content-Type', 'text/yaml; charset=utf-8')
    res.setHeader('Content-Disposition', 'inline; filename="clash-config.yaml"')
    res.setHeader('Profile-Update-Interval', '24')

    res.send(content)
  } catch (error) {
    logger.error(`Subscription error: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

export default router
