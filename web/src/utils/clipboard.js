/**
 * Copy text to clipboard with fallback for non-secure contexts
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  // Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('Modern clipboard API failed, trying fallback...', err)
    }
  }

  // Fallback to document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text

    // Ensure textArea is not visible but part of the DOM
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '0'
    document.body.appendChild(textArea)

    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      return true
    }
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err)
  }

  return false
}
