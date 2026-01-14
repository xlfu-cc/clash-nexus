require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

// Import routes
const subscribeRoutes = require('./routes/subscribe')
const configRoutes = require('./routes/config')
const profileRoutes = require('./routes/profile')
const providerRoutes = require('./routes/provider')

// Import services for initialization
const { initDataDir } = require('./utils/fileStore')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API Routes
app.use('/subscribe', subscribeRoutes)
app.use('/api/configs', configRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/providers', providerRoutes)

// Serve static files (Vue frontend) in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../web/dist')))

  // Handle SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/dist/index.html'))
  })
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

// Initialize data directory and start server
async function start() {
  try {
    await initDataDir()

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║         Clash Nexus Server                ║
╠═══════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}            ║
║  📁 Data directory: ${process.env.DATA_DIR || './data'}        ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}       ║
╚═══════════════════════════════════════════╝
      `)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
