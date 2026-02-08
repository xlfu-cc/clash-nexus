import express from 'express'
import * as authService from '../services/authService.js'
import { authAdmin } from '../middleware/auth.js'

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const result = await authService.login(username, password)

    if (result) {
      res.json(result)
    } else {
      res.status(401).json({ error: 'Invalid credentials' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/password', authAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    await authService.changePassword(oldPassword, newPassword)
    res.json({ success: true })
  } catch (error) {
    if (error.message === 'Invalid old password') {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

router.put('/username', authAdmin, async (req, res) => {
  try {
    const { username } = req.body
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    await authService.updateUsername(username)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/verify', authAdmin, (req, res) => {
  // If authAdmin middleware passes, the token is valid
  res.json({ valid: true })
})

router.post('/logout', authAdmin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader.split(' ')[1]
    await authService.logout(token)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
