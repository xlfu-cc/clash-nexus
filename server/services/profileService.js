/**
 * Profile Service
 * Manages profile definitions
 */
const { v4: uuidv4 } = require('uuid')
const { readData, writeData } = require('../utils/fileStore')

/**
 * Get all profiles
 */
async function getAllProfiles() {
  const data = await readData('profiles')
  return data?.profiles || []
}

/**
 * Get profile by ID or name
 */
async function getProfile(idOrName) {
  const profiles = await getAllProfiles()
  return profiles.find(p => p.id === idOrName || p.name === idOrName)
}

/**
 * Create new profile
 */
async function createProfile(name, description = '') {
  const data = await readData('profiles')
  const profiles = data?.profiles || []

  // Check for duplicate name
  if (profiles.some(p => p.name === name)) {
    throw new Error(`Profile with name "${name}" already exists`)
  }

  const newProfile = {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date().toISOString()
  }

  profiles.push(newProfile)
  await writeData('profiles', { profiles })

  return newProfile
}

/**
 * Update profile
 */
async function updateProfile(id, updates) {
  const data = await readData('profiles')
  const profiles = data?.profiles || []

  const index = profiles.findIndex(p => p.id === id)
  if (index === -1) {
    throw new Error('Profile not found')
  }

  // Check for duplicate name if name is being updated
  if (updates.name && updates.name !== profiles[index].name) {
    if (profiles.some(p => p.name === updates.name)) {
      throw new Error(`Profile with name "${updates.name}" already exists`)
    }
  }

  profiles[index] = {
    ...profiles[index],
    ...updates
  }

  await writeData('profiles', { profiles })
  return profiles[index]
}

/**
 * Delete profile
 */
async function deleteProfile(id) {
  const data = await readData('profiles')
  const profiles = data?.profiles || []

  const index = profiles.findIndex(p => p.id === id)
  if (index === -1) {
    throw new Error('Profile not found')
  }

  profiles.splice(index, 1)
  await writeData('profiles', { profiles })
}

module.exports = {
  getAllProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile
}
