// Utility functions

export type OptionLike = {
  key: string
  text: string
}

export type DisplayOptionSlot = {
  displayKey: string
  originalKey: string
  text: string
}

const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function getOptionDisplayKey(index: number): string {
  return OPTION_LABELS[index] || `#${index + 1}`
}

/**
 * Shuffle an array using Fisher-Yates.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const nextItems = [...items]

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[nextItems[index], nextItems[randomIndex]] = [nextItems[randomIndex], nextItems[index]]
  }

  return nextItems
}

/**
 * Create a shuffled order of option keys.
 */
export function createOptionOrder<T extends OptionLike>(options: T[]): string[] {
  return shuffleArray(options.map(option => option.key))
}

/**
 * Rebuild option objects according to a saved key order.
 * Falls back to the original order if the saved order is incomplete.
 */
export function orderOptionsByKeys<T extends OptionLike>(options: T[], optionOrder?: string[] | null): T[] {
  if (!optionOrder || optionOrder.length === 0 || options.length === 0) {
    return [...options]
  }

  const optionMap = new Map(options.map(option => [option.key, option]))
  const orderedOptions: T[] = []
  const seenKeys = new Set<string>()

  for (const key of optionOrder) {
    const option = optionMap.get(key)
    if (option && !seenKeys.has(key)) {
      orderedOptions.push(option)
      seenKeys.add(key)
    }
  }

  if (orderedOptions.length !== options.length) {
    for (const option of options) {
      if (!seenKeys.has(option.key)) {
        orderedOptions.push(option)
      }
    }
  }

  return orderedOptions
}

/**
 * Convert the original option list into fixed display slots A, B, C, ...
 * while filling each slot with the shuffled option content.
 */
export function getDisplayOptionSlots<T extends OptionLike>(options: T[], optionOrder?: string[] | null): DisplayOptionSlot[] {
  const orderedOptions = orderOptionsByKeys(options, optionOrder)

  return orderedOptions.map((option, index) => ({
    displayKey: getOptionDisplayKey(index),
    originalKey: option.key,
    text: option.text,
  }))
}

/**
 * Map original answer keys into the fixed display labels used by the UI.
 */
export function originalAnswersToDisplayAnswers(answers: string[], optionOrder?: string[] | null): string[] {
  if (!optionOrder || optionOrder.length === 0) {
    return [...answers]
  }

  const displayKeyMap = new Map(optionOrder.map((originalKey, index) => [originalKey, getOptionDisplayKey(index)]))

  return answers.map(answer => displayKeyMap.get(answer) || answer)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Remap explanation option labels (A/B/C...) from original keys to
 * the current UI display keys after option shuffling.
 */
export function remapExplanationOptionLabels(
  explanation: string,
  optionOrder?: string[] | null
): string {
  if (!explanation || !optionOrder || optionOrder.length === 0) {
    return explanation
  }

  const originalToDisplay = optionOrder.map((originalKey, index) => ({
    originalKey: originalKey.toUpperCase(),
    displayKey: getOptionDisplayKey(index),
  }))

  const replacePairs = originalToDisplay.filter(({ originalKey, displayKey }) => originalKey !== displayKey)
  if (replacePairs.length === 0) {
    return explanation
  }

  let rewritten = explanation
  const placeholders: Array<{ token: string; value: string }> = []

  replacePairs.forEach(({ originalKey, displayKey }, index) => {
    const placeholderToken = `__OPT_LABEL_${index}__`
    placeholders.push({ token: placeholderToken, value: displayKey })

    const tokenPattern = new RegExp(
      `(^|[^A-Z0-9])(${escapeRegExp(originalKey)})(?=[^A-Z0-9]|$)`,
      'g'
    )

    rewritten = rewritten.replace(tokenPattern, `$1${placeholderToken}`)
  })

  placeholders.forEach(({ token, value }) => {
    rewritten = rewritten.replaceAll(token, value)
  })

  return rewritten
}

/**
 * Generate a random ID using crypto API
 */
export function createId(): string {
  // Use crypto.randomUUID if available, fallback to cuid-like generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback: generate a cuid-like string
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 8)
  return `${timestamp}${randomPart}`
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  
  return `${size.toFixed(1)} ${sizes[i]}`
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Validate if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Truncate text to a given length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}