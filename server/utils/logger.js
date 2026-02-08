/**
 * Centralized Logger Utility
 */

const isProduction = process.env.NODE_ENV === 'production'

export const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args)
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...args)
  },
  error: (message, ...args) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, ...args)
  },
  debug: (message, ...args) => {
    if (!isProduction) {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...args)
    }
  }
}

export default logger
