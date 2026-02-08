/**
 * Authentication middleware
 * Simple token-based authentication

 * Verify admin token from Authorization header
 * Format: Bearer <token>
 */
import * as authService from '../services/authService.js'

/**
 * Verify admin token from Authorization header
 * Format: Bearer <token>
 */
export function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' })
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' })
  }

  const token = parts[1]
  if (!authService.verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Invalid admin token' })
  }

  next()
}

/**
 * Verify subscribe token from query parameter
 * Format: ?token=<token>
 */
export async function authSubscribe(req, res, next) {
  const token = req.params.token || req.query.token
  const validToken = await authService.getSubscribeToken()

  if (!validToken) {
    // Should not happen if initialized correctly
    return res.status(500).json({ error: 'Subscription service not configured' })
  }

  if (!token) {
    return res.status(401).json({ error: 'Token required' })
  }

  if (token !== validToken) {
    return res.status(403).json({ error: 'Invalid subscribe token' })
  }

  next()
}
