import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { DATA_DIR, initDataDir } from './utils/fileStore.js'

// Import routes
import subscribeRoutes from './routes/subscribe.js'
import configRoutes from './routes/config.js'
import providerRoutes from './routes/provider.js'
import authRoutes from './routes/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// API Routes
app.use('/api/subscribe', subscribeRoutes)
app.use('/api/configs', configRoutes)
app.use('/api/providers', providerRoutes)
app.use('/api/auth', authRoutes)

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
  console.error(`[Error] ${req.method} ${req.url}:`, err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

// Initialize data directory and start server
async function start() {
  try {
    await initDataDir()

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[DEBUG] Server listening on 0.0.0.0:${PORT}`)
      console.log(`
╔═══════════════════════════════════════════╗
║         Clash Nexus Server                ║
╠═══════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}            ║
║  📁 Data directory: ${DATA_DIR}        ║
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
