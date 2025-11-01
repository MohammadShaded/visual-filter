<script>
import { h } from "vue"
import {
  FilterType,
  GroupType,
  DataType,
  deepCopy,
} from "@visual-filter/common"
import { applyFilter, ExtendedDataType } from "../utils.js"

import FilterGroup from "./FilterGroup.vue"
import FilterCondition from "./FilterCondition.vue"

export default {
  name: "VueVisualFilter",
  emits: ["filterUpdate", "update:modelValue"],
  props: {
    filteringOptions: {
      type: Object,
      required: true,
      validator(value) {
        try {
          return (
            value.data.length &&
            value.data.every(
              (field, index, fields) =>
                typeof field.name === "string" &&
                typeof field.type === "string" &&
                field.values.constructor === Array &&
                (index > 0
                  ? field.values.length === fields[index - 1].values.length
                  : true),
            ) &&
            Object.values(value.methods.numeric).every(
              (method) => typeof method === "function",
            ) &&
            Object.values(value.methods.nominal).every(
              (method) => typeof method === "function",
            ) &&
            (value.methods.date ? Object.values(value.methods.date).every(
              (method) => typeof method === "function" || (typeof method === "object" && typeof method.operation === "function"),
            ) : true)
          )
        } catch {
          return false
        }
      },
    },
    modelValue: {
      type: Object,
      default: null,
      validator(value) {
        if (value === null) return true
        try {
          return (
            typeof value === "object" &&
            value.type === FilterType.GROUP &&
            Object.values(GroupType).includes(value.groupType) &&
            Array.isArray(value.filters)
          )
        } catch {
          return false
        }
      },
    },
    maxHistorySize: {
      type: Number,
      default: 50,
      validator(value) {
        return value > 0 && value <= 1000
      },
    },
  },
  data() {
    return {
      internalFilter: {
        type: FilterType.GROUP,
        groupType: GroupType.AND,
        filters: [],
      },
      history: [],
      currentHistoryIndex: -1,
      isRestoringFromHistory: false,
    }
  },
  computed: {
    filter() {
      // Use external modelValue if provided, otherwise use internal state
      return this.modelValue || this.internalFilter
    },
    isExternallyControlled() {
      return this.modelValue !== null
    },
    fieldNames() {
      return this.filteringOptions.data.map((field) => field.name)
    },
    numericMethodNames() {
      return Object.keys(this.filteringOptions.methods.numeric)
    },
    nominalMethodNames() {
      return Object.keys(this.filteringOptions.methods.nominal)
    },
    dateMethodNames() {
      return this.filteringOptions.methods.date ? Object.keys(this.filteringOptions.methods.date) : []
    },
    canUndo() {
      return this.currentHistoryIndex > 0
    },
    canRedo() {
      return this.currentHistoryIndex < this.history.length - 1
    },
  },
  watch: {
    filter: {
      deep: true,
      handler(newFilter) {
        // Only add to history for external state (v-model) scenarios
        if (!this.isRestoringFromHistory && this.isExternallyControlled) {
          this.addToHistory(deepCopy(newFilter))
        }

        const filterData = {
          filter: deepCopy(newFilter),
          data: applyFilter(
            newFilter,
            this.filteringOptions.methods,
            deepCopy(this.filteringOptions.data),
          ),
        }

        this.$emit("filterUpdate", filterData)

        // Emit modelValue update for v-model support
        if (this.isExternallyControlled) {
          this.$emit("update:modelValue", deepCopy(newFilter))
        }
      },
    },
    // Watch internal filter directly to ensure history tracking works
    internalFilter: {
      deep: true,
      handler(newFilter) {
        // Only track if not using external state and not restoring from history
        if (!this.isExternallyControlled && !this.isRestoringFromHistory) {
          this.addToHistory(deepCopy(newFilter))
        }
      },
    },
  },
  mounted() {
    // Initialize history with the initial filter state
    this.addToHistory(deepCopy(this.filter))
  },
  methods: {
    // History management
    addToHistory(filterState) {
      // Skip if identical to current state
      if (this.history.length > 0 && 
          JSON.stringify(this.history[this.currentHistoryIndex]) === JSON.stringify(filterState)) {
        return
      }

      // Remove any future history if we're not at the end
      if (this.currentHistoryIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentHistoryIndex + 1)
      }

      // Add new state
      this.history.push(filterState)
      this.currentHistoryIndex = this.history.length - 1

      // Keep history size within limits
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(-this.maxHistorySize)
        this.currentHistoryIndex = this.history.length - 1
      }
    },

    // Public API methods - exposed via template ref
    getFilterState() {
      return deepCopy(this.filter)
    },

    setFilterState(newFilter) {
      if (!newFilter || typeof newFilter !== 'object') {
        console.warn('VueVisualFilter: Invalid filter state provided to setFilterState')
        return false
      }

      try {
        const filterCopy = deepCopy(newFilter)
        
        if (this.isExternallyControlled) {
          this.$emit("update:modelValue", filterCopy)
        } else {
          this.internalFilter = filterCopy
        }
        return true
      } catch (error) {
        console.warn('VueVisualFilter: Error setting filter state:', error)
        return false
      }
    },

    reset() {
      const initialFilter = {
        type: FilterType.GROUP,
        groupType: GroupType.AND,
        filters: [],
      }
      return this.setFilterState(initialFilter)
    },

    undo() {
      if (!this.canUndo) return false

      this.isRestoringFromHistory = true
      this.currentHistoryIndex--
      const previousState = deepCopy(this.history[this.currentHistoryIndex])
      
      if (this.isExternallyControlled) {
        this.$emit("update:modelValue", previousState)
      } else {
        this.internalFilter = previousState
      }
      
      this.$nextTick(() => {
        this.isRestoringFromHistory = false
      })
      
      return true
    },

    redo() {
      if (!this.canRedo) return false

      this.isRestoringFromHistory = true
      this.currentHistoryIndex++
      const nextState = deepCopy(this.history[this.currentHistoryIndex])
      
      if (this.isExternallyControlled) {
        this.$emit("update:modelValue", nextState)
      } else {
        this.internalFilter = nextState
      }
      
      this.$nextTick(() => {
        this.isRestoringFromHistory = false
      })
      
      return true
    },

    clearHistory() {
      this.history = [deepCopy(this.filter)]
      this.currentHistoryIndex = 0
    },

    getHistory() {
      return {
        history: this.history.map(deepCopy),
        currentIndex: this.currentHistoryIndex,
        canUndo: this.canUndo,
        canRedo: this.canRedo,
      }
    },

    // Serialization utilities
    exportFilterState() {
      return JSON.stringify(this.getFilterState())
    },

    importFilterState(jsonString) {
      try {
        const filterState = JSON.parse(jsonString)
        return this.setFilterState(filterState)
      } catch (error) {
        console.warn('VueVisualFilter: Invalid JSON provided to importFilterState:', error)
        return false
      }
    },

    // Original methods (updated to work with new state management)
    updateConditionField(condition, newFieldName) {
      const {
        type: newType,
        values: [newSampleValue = ""],
      } = this.filteringOptions.data.find(
        (field) => field.name === newFieldName,
      )
      if (condition.dataType !== newType) {
        const defaultMethod = newType === ExtendedDataType.NUMERIC
          ? this.numericMethodNames[0]
          : newType === ExtendedDataType.DATE
          ? this.dateMethodNames[0]
          : this.nominalMethodNames[0]

        condition.method = defaultMethod || ""
        
        // Update arguments array based on new method
        const methodDef = this.getMethodDefinition(newType, defaultMethod)
        const argumentCount = methodDef?.arguments || 1
        
        // Migrate from old single argument to new arguments array if needed
        if (condition.argument !== undefined && !condition.arguments) {
          condition.arguments = [condition.argument]
          delete condition.argument
        }
        
        // Ensure we have the right number of arguments
        condition.arguments = Array(argumentCount).fill(newSampleValue)
        condition.dataType = newType
      }
    },

    updateConditionMethod(condition, newMethod) {
      condition.method = newMethod
      
      // Update arguments array based on new method
      const methodDef = this.getMethodDefinition(condition.dataType, newMethod)
      const argumentCount = methodDef?.arguments || 1
      
      // Preserve existing arguments or use empty strings
      const currentArgs = condition.arguments || (condition.argument ? [condition.argument] : [])
      condition.arguments = Array(argumentCount).fill('').map((_, index) => 
        currentArgs[index] || ''
      )
      
      // Clean up old argument property if it exists
      if (condition.argument !== undefined) {
        delete condition.argument
      }
    },

    // Helper method to get method definition (supports both old and new format)
    getMethodDefinition(dataType, methodName) {
      let methods
      if (dataType === ExtendedDataType.NUMERIC) {
        methods = this.filteringOptions.methods.numeric
      } else if (dataType === ExtendedDataType.DATE) {
        methods = this.filteringOptions.methods.date
      } else {
        methods = this.filteringOptions.methods.nominal
      }

      const method = methods?.[methodName]
      if (typeof method === 'function') {
        // Old format - single argument
        return { arguments: 1, operation: method }
      } else if (typeof method === 'object' && method.operation) {
        // New format - multi-argument
        return method
      }
      return null
    },

    addFilter(filters, newFilterType) {
      if (newFilterType === FilterType.GROUP) {
        filters.push({
          type: FilterType.GROUP,
          groupType: GroupType.AND,
          filters: [],
        })
      } else {
        const {
          name,
          type,
          values: [sampleValue = ""],
        } = this.filteringOptions.data[0]

        const defaultMethod = type === ExtendedDataType.NUMERIC
          ? this.numericMethodNames[0]
          : type === ExtendedDataType.DATE
          ? this.dateMethodNames[0]
          : this.nominalMethodNames[0]

        const methodDef = this.getMethodDefinition(type, defaultMethod)
        const argumentCount = methodDef?.arguments || 1

        filters.push({
          type: FilterType.CONDITION,
          fieldName: name,
          dataType: type,
          method: defaultMethod || "",
          arguments: Array(argumentCount).fill(sampleValue),
        })
      }
    },
    deleteFilter(filterToDelete) {
      function recursiveDeletion(filter, index, filters) {
        if (filter === filterToDelete) {
          filters.splice(index, 1)
        } else if (filter.type === FilterType.GROUP) {
          filter.filters.map(recursiveDeletion)
        }
      }

      if (filterToDelete !== this.filter) {
        recursiveDeletion(this.filter)
      }
    },
  },
  render() {
    const createVisualizer = (filter) => {
      if (filter.type === FilterType.GROUP) {
        return h(
          FilterGroup,
          {
            group: filter,
            filterTypes: Object.values(FilterType),
            groupTypes: Object.values(GroupType),
            removable: filter !== this.filter,
            onAddFilter: this.addFilter,
            onDeleteGroup: this.deleteFilter,
          },
          {
            groupTypes: this.$slots.groupTypes,
            filterAddition: this.$slots.filterAddition,
            groupDeletion: this.$slots.groupDeletion,
            groupChildren: () => filter.filters.map(createVisualizer),
          },
        )
      } else {
        return h(
          FilterCondition,
          {
            condition: filter,
            fieldNames: this.fieldNames,
            numericMethodNames: this.numericMethodNames,
            nominalMethodNames: this.nominalMethodNames,
            dateMethodNames: this.dateMethodNames,
            onUpdateField: this.updateConditionField,
            onUpdateMethod: this.updateConditionMethod,
            onDeleteCondition: this.deleteFilter,
          },
          {
            fieldUpdation: this.$slots.fieldUpdation,
            methodUpdation: this.$slots.methodUpdation,
            argumentUpdation: this.$slots.argumentUpdation,
            conditionDeletion: this.$slots.conditionDeletion,
          },
        )
      }
    }

    return createVisualizer(this.filter)
  },
}
</script>
