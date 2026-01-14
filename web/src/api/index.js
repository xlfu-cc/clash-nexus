/**
 * API Client
 * Handles all API calls to the backend
 */

const API_BASE = '/api'
const ADMIN_TOKEN = localStorage.getItem('adminToken') || 'dev-admin-token'

/**
 * Set admin token
 */
export function setAdminToken(token) {
  localStorage.setItem('adminToken', token)
}

/**
 * Get admin token
 */
export function getAdminToken() {
  return localStorage.getItem('adminToken') || 'dev-admin-token'
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

// ============ Profile API ============

export const profileApi = {
  async list() {
    return request('/profiles')
  },

  async get(id) {
    return request(`/profiles/${id}`)
  },

  async create(name, description) {
    return request('/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    })
  },

  async update(id, data) {
    return request(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  async delete(id) {
    return request(`/profiles/${id}`, {
      method: 'DELETE'
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

  async create(name, url, interval) {
    return request('/providers', {
      method: 'POST',
      body: JSON.stringify({ name, url, interval })
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
  }
}

// ============ Subscribe URL Generator ============

export function generateSubscribeUrl(profile = '', token = '') {
  const baseUrl = window.location.origin
  const params = new URLSearchParams()

  if (profile) {
    params.set('profile', profile)
  }
  if (token) {
    params.set('token', token)
  }

  const queryString = params.toString()
  return `${baseUrl}/subscribe${queryString ? '?' + queryString : ''}`
}
