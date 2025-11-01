import { FilterType, GroupType, deepCopy } from "@visual-filter/common"

// Extended DataType to include DATE within Vue3 package only
export const ExtendedDataType = {
  NUMERIC: "numeric",
  NOMINAL: "nominal", 
  DATE: "date"
}

/**
 * Enhanced applyer that supports both old function format and new multi-argument format
 * This is a complete replacement for the base applyer with multi-argument support
 */
export function applyFilter(filter, methods, data) {
  function buildPremiseTree(filter) {
    if (filter.type === FilterType.CONDITION) {
      return data
        .find((field) => field.name === filter.fieldName)
        .values.map((value) => {
          try {
            const method = methods[filter.dataType][filter.method]
            
            // Handle both old function format and new object format
            if (typeof method === 'function') {
              // Old format - single argument
              const argument = filter.arguments ? filter.arguments[0] : filter.argument
              return method(value, argument)
            } else if (method && typeof method.operation === 'function') {
              // New format - multi-argument
              const args = filter.arguments || (filter.argument ? [filter.argument] : [])
              return method.operation(value, ...args)
            }
            
            return false
          } catch {
            return false
          }
        })
    }
    return filter.filters.map(buildPremiseTree)
  }

  function shouldntDeleteRow(rowIndex, premises, group) {
    for (
      let conditionIndex = 0;
      conditionIndex < premises.length;
      ++conditionIndex
    ) {
      const currentPremise =
        premises[conditionIndex][0]?.constructor === Array
          ? shouldntDeleteRow(
              rowIndex,
              premises[conditionIndex],
              group.filters[conditionIndex],
            )
          : premises[conditionIndex][rowIndex]

      if (currentPremise === true) {
        switch (group.groupType) {
          case GroupType.AND:
            continue
          case GroupType.NOT_AND:
            return false
          case GroupType.OR:
            return true
          case GroupType.NOT_OR:
            continue
        }
      } else {
        switch (group.groupType) {
          case GroupType.AND:
            return false
          case GroupType.NOT_AND:
            continue
          case GroupType.OR:
            continue
          case GroupType.NOT_OR:
            return true
        }
      }
    }

    switch (group.groupType) {
      case GroupType.AND:
      case GroupType.NOT_AND:
        return true
      case GroupType.OR:
      case GroupType.NOT_OR:
        return false
    }
  }

  const premiseTree = buildPremiseTree(filter)

  for (
    let rowIndex = 0, rowsCount = data[0].values.length, deletionCount = 0;
    rowIndex < rowsCount;
    ++rowIndex
  ) {
    if (shouldntDeleteRow(rowIndex, premiseTree, filter) === false) {
      data.forEach((field) =>
        field.values.splice(rowIndex - deletionCount, 1),
      )
      ++deletionCount
    }
  }

  return data
}

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
  const filters = conditions.map(condition => {
    const filter = {
      type: FilterType.CONDITION,
      fieldName: condition.fieldName || '',
      dataType: condition.dataType || 'nominal',
      method: condition.method || '',
    }
    
    // Handle both old argument and new arguments format
    if (condition.arguments) {
      filter.arguments = condition.arguments
    } else if (condition.argument !== undefined) {
      filter.arguments = [condition.argument]
    } else {
      filter.arguments = ['']
    }
    
    return filter
  })

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