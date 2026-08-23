/**
 * API Client
 * Handles all API calls to the backend
 */

const API_BASE = '/api'

/**
 * Set admin token
 */
export function setAdminToken(token) {
  localStorage.setItem('adminToken', token)
}

/**
 * Login
 */
export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }))
    throw new Error(error.error || 'Login failed')
  }

  const data = await response.json()
  setAdminToken(data.token)
  return data
}

/**
 * Logout
 */
export async function logout() {
  try {
    const token = getAdminToken()
    if (!token) return
    await request('/auth/logout', { method: 'POST' })
  } finally {
    localStorage.removeItem('adminToken')
    window.location.href = '/login'
  }
}

/**
 * Change Password
 */
export async function changePassword(oldPassword, newPassword) {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword })
  })
}

/**
 * Update Username
 */
export async function updateUsername(username) {
  return request('/auth/username', {
    method: 'PUT',
    body: JSON.stringify({ username })
  })
}

/**
 * Get admin token
 */
export function getAdminToken() {
  return localStorage.getItem('adminToken') || ''
}

/**
 * Check if session is valid
 */
export async function checkSession() {
  try {
    const token = getAdminToken()
    if (!token) return false
    await request('/auth/verify')
    return true
  } catch (error) {
    return false
  }
}

/**
 * Make API request
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAdminToken()}`,
    ...options.headers
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('adminToken')
      window.location.href = '/login' // Use href to force full reload/redirect
      throw new Error('Unauthorized')
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

// ============ Config API ============

export const configApi = {
  async list() {
    return request('/configs')
  },

  async get(id) {
    return request(`/configs/${id}`)
  },

  async create(name, content) {
    return request('/configs', {
      method: 'POST',
      body: JSON.stringify({ name, content })
    })
  },

  async update(id, data) {
    return request(`/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  async delete(id) {
    return request(`/configs/${id}`, {
      method: 'DELETE'
    })
  },

  async activate(id) {
    return request(`/configs/${id}/activate`, {
      method: 'PUT'
    })
  }
}

// ============ Provider API ============

export const providerApi = {
  async list() {
    return request('/providers')
  },

  async get(id) {
    return request(`/providers/${id}`)
  },

  async create(data) {
    return request('/providers', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async update(id, data) {
    return request(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  async delete(id) {
    return request(`/providers/${id}`, {
      method: 'DELETE'
    })
  },

  async refresh(id) {
    return request(`/providers/${id}/refresh`, {
      method: 'POST'
    })
  },

  async refreshAll() {
    return request('/providers/refresh', {
      method: 'POST'
    })
  }
}

// ============ Profile API ============

export const profileApi = {
  async list() {
    return request('/configs/profiles')
  }
}

// ============ Subscribe API ============
export const subscribeApi = {
  async getToken() {
    return request('/subscribe/token')
  },

  async rotateToken() {
    return request('/subscribe/token/rotate', {
      method: 'POST'
    })
  }
}

// ============ Subscribe URL Generator ============

export function generateSubscribeUrl(profile = '', token = '', forceRefresh = false) {
  const baseUrl = window.location.origin
  const path = `/api/subscribe/${token}`
  const params = new URLSearchParams()

  if (profile) {
    params.set('profile', profile)
  }
  if (forceRefresh) {
    params.set('refresh', '1')
  }

  const queryString = params.toString()
  return `${baseUrl}${path}${queryString ? '?' + queryString : ''}`
}
