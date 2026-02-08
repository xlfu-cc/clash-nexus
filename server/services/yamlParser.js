import yaml from 'js-yaml'

// Regex patterns
const SINGLE_LINE_PATTERN = /^([^#\n]*[^#\s][^#\n]*)\s*#\s*@profile:\s*(!?)(\w+)\s*$/
const BLOCK_START_PATTERN = /^(\s*)#\s*@profile:\s*(!?)(\w+)\s*\{\s*$/
const BLOCK_END_PATTERN = /^(\s*)#\s*\}\s*$/

/**
 * Parse YAML content and filter by profile
 * @param {string} content - Raw YAML content with profile markers
 * @param {string} targetProfile - Target profile name to filter for
 * @returns {string} - Filtered YAML content
 */
export function parseByProfile(content, targetProfile) {
  const lines = content.split('\n')
  const result = []

  let blockStack = [] // Stack of { profile, exclude, indent }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for block start
    const blockStartMatch = line.match(BLOCK_START_PATTERN)
    if (blockStartMatch) {
      const [, indent, exclude, profile] = blockStartMatch
      blockStack.push({
        profile,
        exclude: exclude === '!',
        indent: indent.length
      })
      continue // Don't include the marker line itself
    }

    // Check for block end
    const blockEndMatch = line.match(BLOCK_END_PATTERN)
    if (blockEndMatch && blockStack.length > 0) {
      blockStack.pop()
      continue // Don't include the marker line itself
    }

    // Check for single line marker
    const singleLineMatch = line.match(SINGLE_LINE_PATTERN)
    if (singleLineMatch) {
      const [, content, exclude, profile] = singleLineMatch
      const isExclude = exclude === '!'

      // Determine if this line should be included
      const shouldInclude = isExclude
        ? profile !== targetProfile // Include if NOT this profile
        : profile === targetProfile // Include if IS this profile

      if (shouldInclude) {
        // Use the content part from the match
        result.push(content.trimEnd())
      }
      continue
    }

    // Regular line - check if it should be included based on current block context
    if (blockStack.length > 0) {
      // Inside a block - check if the block profile matches
      const currentBlock = blockStack[blockStack.length - 1]
      const shouldInclude = currentBlock.exclude
        ? currentBlock.profile !== targetProfile // Include if NOT this profile
        : currentBlock.profile === targetProfile // Include if IS this profile

      if (shouldInclude) {
        result.push(line)
      }
    } else {
      // No block context - this is common content, always include
      result.push(line)
    }
  }

  return result.join('\n')
}

/**
 * Extract all profile names from YAML content
 * @param {string} content - Raw YAML content
 * @returns {Array<{id: string, name: string, description: string}>} - Array of profile objects
 */
export function extractProfiles(content) {
  const profileNames = new Set()
  const lines = content.split('\n')

  for (const line of lines) {
    // Check single line markers
    const singleMatch = line.match(SINGLE_LINE_PATTERN)
    if (singleMatch) {
      profileNames.add(singleMatch[3])
    }

    // Check block start markers
    const blockMatch = line.match(BLOCK_START_PATTERN)
    if (blockMatch) {
      profileNames.add(blockMatch[3])
    }
  }

  return Array.from(profileNames)
}

/**
 * Validate YAML content syntax (basic check)
 * @param {string} content - YAML content to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSyntax(content) {
  const lines = content.split('\n')
  const stack = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    if (BLOCK_START_PATTERN.test(line)) {
      const match = line.match(BLOCK_START_PATTERN)
      stack.push({ line: lineNum, profile: match[3] })
    } else if (BLOCK_END_PATTERN.test(line)) {
      if (stack.length === 0) {
        return { valid: false, error: `Row ${lineNum}: detection of redundant closing labels # }` }
      }
      stack.pop()
    }
  }

  if (stack.length > 0) {
    const last = stack.pop()
    return { valid: false, error: `Row ${last.line}: profile block { containing "${last.profile}" is not closed` }
  }

  // First, strip out profile markers for validation
  const cleanContent = content
    .split('\n')
    .filter(line => !BLOCK_START_PATTERN.test(line) && !BLOCK_END_PATTERN.test(line))
    .map(line => line.replace(SINGLE_LINE_PATTERN, ''))
    .join('\n')

  try {
    yaml.load(cleanContent)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}
