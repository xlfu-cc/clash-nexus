/**
 * Authentication middleware
 * Simple token-based authentication
 */

/**
 * Verify admin token from Authorization header
 * Format: Bearer <token>
 */
function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  const adminToken = process.env.ADMIN_TOKEN

  if (!adminToken) {
    // If no admin token configured, allow access (development mode)
    console.warn('Warning: ADMIN_TOKEN not configured, skipping auth')
    return next()
  }

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' })
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' })
  }

  const token = parts[1]
  if (token !== adminToken) {
    return res.status(403).json({ error: 'Invalid admin token' })
  }

  next()
}

/**
 * Verify subscribe token from query parameter
 * Format: ?token=<token>
 */
function authSubscribe(req, res, next) {
  const subscribeToken = process.env.SUBSCRIBE_TOKEN
  const token = req.query.token

  if (!subscribeToken) {
    // If no subscribe token configured, allow access (development mode)
    console.warn('Warning: SUBSCRIBE_TOKEN not configured, skipping auth')
    return next()
  }

  if (!token) {
    return res.status(401).json({ error: 'Token query parameter required' })
  }

  if (token !== subscribeToken) {
    return res.status(403).json({ error: 'Invalid subscribe token' })
  }

  next()
}

module.exports = {
  authAdmin,
  authSubscribe
}
