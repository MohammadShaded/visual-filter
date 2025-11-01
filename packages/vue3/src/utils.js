import { FilterType, GroupType, deepCopy } from "@visual-filter/common"

/**
 * Utility functions for working with Vue Visual Filter
 */

/**
 * Creates an empty filter state
 * @returns {Object} Empty filter state
 */
export function createEmptyFilter() {
  return {
    type: FilterType.GROUP,
    groupType: GroupType.AND,
    filters: [],
  }
}

/**
 * Validates if an object is a valid filter state
 * @param {Object} filterState - The filter state to validate
 * @returns {boolean} True if valid
 */
export function isValidFilterState(filterState) {
  if (!filterState || typeof filterState !== 'object') return false
  
  try {
    return validateFilterRecursive(filterState)
  } catch {
    return false
  }
}

function validateFilterRecursive(filter) {
  if (filter.type === FilterType.GROUP) {
    return (
      Object.values(GroupType).includes(filter.groupType) &&
      Array.isArray(filter.filters) &&
      filter.filters.every(validateFilterRecursive)
    )
  } else if (filter.type === FilterType.CONDITION) {
    return (
      typeof filter.fieldName === 'string' &&
      typeof filter.dataType === 'string' &&
      typeof filter.method === 'string' &&
      filter.argument !== undefined
    )
  }
  return false
}

/**
 * Creates a pre-configured filter with specific conditions
 * @param {Array} conditions - Array of condition objects
 * @param {string} groupType - Group type (default: 'and')
 * @returns {Object} Pre-configured filter state
 */
export function createPresetFilter(conditions = [], groupType = GroupType.AND) {
  const filters = conditions.map(condition => ({
    type: FilterType.CONDITION,
    fieldName: condition.fieldName || '',
    dataType: condition.dataType || 'nominal',
    method: condition.method || '',
    argument: condition.argument || '',
  }))

  return {
    type: FilterType.GROUP,
    groupType,
    filters,
  }
}

/**
 * Serializes filter state to JSON string
 * @param {Object} filterState - The filter state to serialize
 * @returns {string} JSON string representation
 */
export function serializeFilterState(filterState) {
  try {
    return JSON.stringify(filterState)
  } catch (error) {
    console.warn('Failed to serialize filter state:', error)
    return null
  }
}

/**
 * Deserializes filter state from JSON string
 * @param {string} jsonString - JSON string to deserialize
 * @returns {Object|null} Filter state object or null if invalid
 */
export function deserializeFilterState(jsonString) {
  try {
    const filterState = JSON.parse(jsonString)
    return isValidFilterState(filterState) ? filterState : null
  } catch (error) {
    console.warn('Failed to deserialize filter state:', error)
    return null
  }
}

/**
 * Creates filter state suitable for URL parameters
 * @param {Object} filterState - The filter state to encode
 * @returns {string} Base64 encoded filter state
 */
export function encodeFilterStateForURL(filterState) {
  try {
    const jsonString = serializeFilterState(filterState)
    return btoa(encodeURIComponent(jsonString))
  } catch (error) {
    console.warn('Failed to encode filter state for URL:', error)
    return null
  }
}

/**
 * Decodes filter state from URL parameter
 * @param {string} encodedState - Base64 encoded filter state
 * @returns {Object|null} Filter state object or null if invalid
 */
export function decodeFilterStateFromURL(encodedState) {
  try {
    const jsonString = decodeURIComponent(atob(encodedState))
    return deserializeFilterState(jsonString)
  } catch (error) {
    console.warn('Failed to decode filter state from URL:', error)
    return null
  }
}

/**
 * Helper for managing filter state in localStorage
 */
export const FilterStateStorage = {
  /**
   * Save filter state to localStorage
   * @param {string} key - Storage key
   * @param {Object} filterState - Filter state to save
   * @returns {boolean} Success status
   */
  save(key, filterState) {
    try {
      const serialized = serializeFilterState(filterState)
      if (serialized) {
        localStorage.setItem(key, serialized)
        return true
      }
      return false
    } catch (error) {
      console.warn('Failed to save filter state to localStorage:', error)
      return false
    }
  },

  /**
   * Load filter state from localStorage
   * @param {string} key - Storage key
   * @returns {Object|null} Filter state or null if not found/invalid
   */
  load(key) {
    try {
      const stored = localStorage.getItem(key)
      return stored ? deserializeFilterState(stored) : null
    } catch (error) {
      console.warn('Failed to load filter state from localStorage:', error)
      return null
    }
  },

  /**
   * Remove filter state from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn('Failed to remove filter state from localStorage:', error)
      return false
    }
  },

  /**
   * List all saved filter keys with a specific prefix
   * @param {string} prefix - Key prefix to search for
   * @returns {Array} Array of keys
   */
  listKeys(prefix = 'visual-filter-') {
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          keys.push(key)
        }
      }
      return keys
    } catch (error) {
      console.warn('Failed to list filter keys from localStorage:', error)
      return []
    }
  }
}