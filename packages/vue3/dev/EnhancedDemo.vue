<script>
import { 
  createEmptyFilter, 
  createPresetFilter, 
  FilterStateStorage, 
  encodeFilterStateForURL, 
  decodeFilterStateFromURL,
  FilterType,
  GroupType,
  DataType,
  ExtendedDataType
} from "../src/main.js"

export default {
  name: "EnhancedDemo",
  data() {
    return {
      // External filter state for v-model demo
      externalFilterState: null,
      
      // Saved filters
      savedFilters: [],
      
      // Demo data and methods
      filteringOptions: {
        data: [
          {
            name: "First Name",
            type: "nominal",
            values: ["Obada", "Ahmad", "Omar", "Sarah", "Leila"],
          },
          {
            name: "Last Name", 
            type: "nominal",
            values: ["Khalili", "Drhili", "Hala hili", "Smith", "Johnson"],
          },
          {
            name: "Grade",
            type: "numeric",
            values: [3.72, 3.52, 3.4, 2.8, 4.0],
          },
          {
            name: "Age",
            type: "numeric", 
            values: [22, 25, 19, 30, 28],
          },
          {
            name: "Department",
            type: "nominal",
            values: ["Engineering", "Marketing", "Sales", "HR", "Finance"],
          },
          {
            name: "Hire Date",
            type: "date",
            values: ["2023-01-15", "2022-06-10", "2024-03-22", "2021-11-05", "2023-09-18"],
          },
          {
            name: "Last Login",
            type: "date", 
            values: ["2024-10-30", "2024-10-28", "2024-10-31", "2024-10-25", "2024-10-29"],
          },
        ],
        methods: {
          numeric: {
            "="(cellValue, argument) {
              return cellValue == argument
            },
            ">"(cellValue, argument) {
              return cellValue > argument
            },
            "<"(cellValue, argument) {
              return cellValue < argument
            },
            ">="(cellValue, argument) {
              return cellValue >= argument
            },
            "<="(cellValue, argument) {
              return cellValue <= argument
            },
          },
          nominal: {
            contains(cellValue, argument) {
              return cellValue.includes(argument)
            },
            startsWith(cellValue, argument) {
              return cellValue.startsWith(argument)
            },
            endsWith(cellValue, argument) {
              return cellValue.endsWith(argument)
            },
            equals(cellValue, argument) {
              return cellValue === argument
            },
          },
          date: {
            before: {
              arguments: 1,
              operation: (cellValue, argument) => {
                const cellDate = new Date(cellValue)
                const argDate = new Date(argument)
                return cellDate < argDate
              }
            },
            after: {
              arguments: 1,
              operation: (cellValue, argument) => {
                const cellDate = new Date(cellValue)
                const argDate = new Date(argument)
                return cellDate > argDate
              }
            },
            on: {
              arguments: 1,
              operation: (cellValue, argument) => {
                const cellDate = new Date(cellValue)
                const argDate = new Date(argument)
                return cellDate.getTime() === argDate.getTime()
              }
            },
            not_on: {
              arguments: 1,
              operation: (cellValue, argument) => {
                const cellDate = new Date(cellValue)
                const argDate = new Date(argument)
                return cellDate.getTime() !== argDate.getTime()
              }
            },
            between: {
              arguments: 2,
              operation: (cellValue, startDate, endDate) => {
                const cellDate = new Date(cellValue)
                const start = new Date(startDate)
                const end = new Date(endDate)
                return cellDate >= start && cellDate <= end
              }
            },
            not_between: {
              arguments: 2,
              operation: (cellValue, startDate, endDate) => {
                const cellDate = new Date(cellValue)
                const start = new Date(startDate)
                const end = new Date(endDate)
                return cellDate < start || cellDate > end
              }
            },
          },
        },
      },
      
      // UI state
      currentTab: 'basic',
      filterName: '',
      showHistory: false,
      shareableLink: '',
      
      // Reactive trigger for history updates
      historyUpdateTrigger: 0,
    }
  },
  
  computed: {
    historyInfo() {
      // Use historyUpdateTrigger to make this reactive
      this.historyUpdateTrigger
      return this.$refs.filterComponent?.getHistory() || { history: [], currentIndex: -1, canUndo: false, canRedo: false }
    },
    
    presetFilters() {
      return [
        {
          name: "High Performers",
          description: "Students with grade > 3.5",
          filter: createPresetFilter([
            { fieldName: "Grade", dataType: "numeric", method: ">", argument: "3.5" }
          ])
        },
        {
          name: "Engineering Department",
          description: "All engineering employees",
          filter: createPresetFilter([
            { fieldName: "Department", dataType: "nominal", method: "equals", argument: "Engineering" }
          ])
        },
        {
          name: "Young & High Grade",
          description: "Young people with good grades",
          filter: createPresetFilter([
            { fieldName: "Age", dataType: "numeric", method: "<", argument: "25" },
            { fieldName: "Grade", dataType: "numeric", method: ">", argument: "3.0" }
          ], GroupType.AND)
        },
        {
          name: "Recently Hired",
          description: "Employees hired after 2023",
          filter: createPresetFilter([
            { fieldName: "Hire Date", dataType: "date", method: "after", argument: "2023-01-01" }
          ])
        },
        {
          name: "Active This Week",
          description: "Users who logged in after Oct 25, 2024",
          filter: createPresetFilter([
            { fieldName: "Last Login", dataType: "date", method: "after", argument: "2024-10-25" }
          ])
        },
        {
          name: "Specific Login Date",
          description: "Users who logged in on Oct 30, 2024",
          filter: createPresetFilter([
            { fieldName: "Last Login", dataType: "date", method: "on", argument: "2024-10-30" }
          ])
        },
        {
          name: "Login Date Range",
          description: "Users who logged in between Oct 25 and Oct 30, 2024",
          filter: createPresetFilter([
            { fieldName: "Last Login", dataType: "date", method: "between", arguments: ["2024-10-25", "2024-10-30"] }
          ])
        }
      ]
    }
  },
  
  mounted() {
    this.loadSavedFilters()
    this.loadFilterFromURL()
  },
  
  methods: {
    // Filter event handlers
    captureFilterUpdate(ctx) {
      console.log('Filter updated:', ctx)
      this.updateShareableLink()
      // Trigger history info reactivity
      this.historyUpdateTrigger++
    },
    
    // Reset functionality
    resetFilter() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.reset()
        this.updateShareableLink()
        this.historyUpdateTrigger++
      }
    },
    
    // Undo/Redo functionality
    undoFilter() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.undo()
        this.updateShareableLink()
        this.historyUpdateTrigger++
      }
    },
    
    redoFilter() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.redo()
        this.updateShareableLink()
        this.historyUpdateTrigger++
      }
    },
    
    clearHistory() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.clearHistory()
        this.historyUpdateTrigger++
      }
    },
    
    // Saved filters functionality
    loadSavedFilters() {
      const keys = FilterStateStorage.listKeys('demo-filter-')
      this.savedFilters = keys.map(key => {
        const filter = FilterStateStorage.load(key)
        return {
          key,
          name: key.replace('demo-filter-', ''),
          filter,
          timestamp: new Date().toISOString() // In real app, store timestamp
        }
      }).filter(item => item.filter !== null)
    },
    
    saveCurrentFilter() {
      if (!this.filterName.trim()) {
        alert('Please enter a name for the filter')
        return
      }
      
      const currentFilter = this.$refs.filterComponent?.getFilterState()
      if (currentFilter) {
        const key = `demo-filter-${this.filterName.trim()}`
        const success = FilterStateStorage.save(key, currentFilter)
        
        if (success) {
          this.loadSavedFilters()
          this.filterName = ''
          alert('Filter saved successfully!')
        } else {
          alert('Failed to save filter')
        }
      }
    },
    
    loadSavedFilter(savedFilter) {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.setFilterState(savedFilter.filter)
        this.updateShareableLink()
      }
    },
    
    deleteSavedFilter(savedFilter) {
      if (confirm(`Delete filter "${savedFilter.name}"?`)) {
        FilterStateStorage.remove(savedFilter.key)
        this.loadSavedFilters()
      }
    },
    
    // Preset filters functionality
    loadPresetFilter(preset) {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.setFilterState(preset.filter)
        this.updateShareableLink()
      }
    },
    
    // URL sharing functionality
    updateShareableLink() {
      if (this.$refs.filterComponent) {
        const currentFilter = this.$refs.filterComponent.getFilterState()
        const encoded = encodeFilterStateForURL(currentFilter)
        if (encoded) {
          const url = new URL(window.location)
          url.searchParams.set('filter', encoded)
          this.shareableLink = url.toString()
        }
      }
    },
    
    loadFilterFromURL() {
      const urlParams = new URLSearchParams(window.location.search)
      const encodedFilter = urlParams.get('filter')
      
      if (encodedFilter) {
        const filter = decodeFilterStateFromURL(encodedFilter)
        if (filter) {
          this.externalFilterState = filter
        }
      }
    },
    
    copyShareableLink() {
      navigator.clipboard.writeText(this.shareableLink).then(() => {
        alert('Link copied to clipboard!')
      }).catch(() => {
        alert('Failed to copy link')
      })
    },
    
    // External state demo
    useExternalState() {
      this.externalFilterState = this.$refs.filterComponent?.getFilterState() || createEmptyFilter()
    },
    
    useInternalState() {
      if (this.externalFilterState && this.$refs.filterComponent) {
        // Set the current external state to internal before switching
        this.$refs.filterComponent.setFilterState(this.externalFilterState)
      }
      this.externalFilterState = null
    },
    
    // Export/Import functionality
    exportFilter() {
      const currentFilter = this.$refs.filterComponent?.getFilterState()
      if (currentFilter) {
        const jsonString = this.$refs.filterComponent.exportFilterState()
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'visual-filter-export.json'
        a.click()
        URL.revokeObjectURL(url)
      }
    },
    
    importFilter() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const success = this.$refs.filterComponent?.importFilterState(e.target.result)
            if (success) {
              this.updateShareableLink()
              alert('Filter imported successfully!')
            } else {
              alert('Failed to import filter - invalid format')
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    },

    // Helper methods for saved filters
    getCurrentFilterInfo() {
      const currentFilter = this.$refs.filterComponent?.getFilterState()
      if (!currentFilter || currentFilter.filters.length === 0) {
        return 'No conditions (empty filter)'
      }
      return `${currentFilter.filters.length} condition(s)`
    },

    formatDate(timestamp) {
      try {
        return new Date(timestamp).toLocaleDateString()
      } catch {
        return 'Unknown date'
      }
    }
  }
}
</script>

<template>
  <div style="max-width: 1200px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <h1 style="text-align: center; font-size: 2rem; font-weight: bold; margin-bottom: 2rem; color: #333;">
      Vue Visual Filter - Enhanced API Demo
    </h1>
    
    <!-- Tab Navigation -->
    <div style="display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 2rem; flex-wrap: wrap; gap: 0.5rem;">
      <button 
        @click="currentTab = 'basic'"
        :style="{ 
          padding: '0.75rem 1rem', 
          border: 'none', 
          background: 'none', 
          color: currentTab === 'basic' ? '#3b82f6' : '#6b7280',
          fontWeight: '500',
          cursor: 'pointer',
          borderBottom: currentTab === 'basic' ? '2px solid #3b82f6' : '2px solid transparent',
          transition: 'all 0.2s'
        }"
      >
        Basic Usage & Controls
      </button>
      <button 
        @click="currentTab = 'external'"
        :style="{ 
          padding: '0.75rem 1rem', 
          border: 'none', 
          background: 'none', 
          color: currentTab === 'external' ? '#3b82f6' : '#6b7280',
          fontWeight: '500',
          cursor: 'pointer',
          borderBottom: currentTab === 'external' ? '2px solid #3b82f6' : '2px solid transparent',
          transition: 'all 0.2s'
        }"
      >
        External State (v-model)
      </button>
      <button 
        @click="currentTab = 'saved'"
        :style="{ 
          padding: '0.75rem 1rem', 
          border: 'none', 
          background: 'none', 
          color: currentTab === 'saved' ? '#3b82f6' : '#6b7280',
          fontWeight: '500',
          cursor: 'pointer',
          borderBottom: currentTab === 'saved' ? '2px solid #3b82f6' : '2px solid transparent',
          transition: 'all 0.2s'
        }"
      >
        Saved Filters
      </button>
     
    </div>

    <!-- Basic Usage Tab -->
    <div v-if="currentTab === 'basic'" style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="padding: 1rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background: #f9fafb;">
        <h3 style="margin: 0 0 0.5rem 0; font-weight: 600; color: #111827;">Internal State Management with Enhanced Controls</h3>
        <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">This demonstrates the traditional usage with internal state management and new control methods including reset, undo/redo, and history tracking.</p>
      </div>
      
      <!-- Control buttons -->
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
        <button @click="resetFilter" style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #6b7280; color: white;">
          🔄 Reset Filter
        </button>
        <button @click="undoFilter" :disabled="!historyInfo.canUndo" 
                style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #3b82f6; color: white;"
                :style="{ opacity: historyInfo.canUndo ? 1 : 0.5, cursor: historyInfo.canUndo ? 'pointer' : 'not-allowed' }">
          ↶ Undo
        </button>
        <button @click="redoFilter" :disabled="!historyInfo.canRedo"
                style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #3b82f6; color: white;"
                :style="{ opacity: historyInfo.canRedo ? 1 : 0.5, cursor: historyInfo.canRedo ? 'pointer' : 'not-allowed' }">
          ↷ Redo
        </button>
        <button @click="showHistory = !showHistory" style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #8b5cf6; color: white;">
          📋 {{ showHistory ? 'Hide' : 'Show' }} History
        </button>
        <button @click="clearHistory" style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #ef4444; color: white;">
          🗑️ Clear History
        </button>
        <button @click="exportFilter" style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #10b981; color: white;">
          📥 Export
        </button>
        <button @click="importFilter" style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #10b981; color: white;">
          📤 Import
        </button>
      </div>

      <!-- History display -->
      <div v-if="showHistory" style="padding: 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: #f9fafb;">
        <h4 style="margin: 0 0 0.5rem 0; font-weight: 600;">Filter History ({{ historyInfo.history.length }} states)</h4>
        <p style="margin: 0 0 0.75rem 0; font-size: 0.875rem; color: #6b7280;">Current: {{ historyInfo.currentIndex + 1 }} / {{ historyInfo.history.length }}</p>
        <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem;">
          <div v-for="(state, index) in historyInfo.history" :key="index"
               :style="{ 
                 padding: '0.5rem', 
                 border: '1px solid #d1d5db', 
                 borderRadius: '0.25rem', 
                 background: index === historyInfo.currentIndex ? '#dbeafe' : 'white',
                 borderColor: index === historyInfo.currentIndex ? '#3b82f6' : '#d1d5db',
                 fontSize: '0.75rem'
               }">
            <strong>State {{ index + 1 }}:</strong> {{ state.filters.length }} filter(s)
          </div>
        </div>
      </div>
    </div>

    <!-- External State Tab -->
    <div v-if="currentTab === 'external'" style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="padding: 1rem; border-radius: 0.5rem; border: 1px solid #bbf7d0; background: #f0fdf4;">
        <h3 style="margin: 0 0 0.5rem 0; font-weight: 600; color: #111827;">External State Management (v-model)</h3>
        <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">This demonstrates using v-model for external state control, allowing parent components to manage filter state.</p>
      </div>
      
      <!-- State control -->
      <div style="display: flex; gap: 0.75rem;">
        <button @click="useExternalState" v-if="!externalFilterState" 
                style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #10b981; color: white;">
          🔄 Switch to External State
        </button>
        <button @click="useInternalState" v-if="externalFilterState"
                style="padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #3b82f6; color: white;">
          🔄 Switch to Internal State
        </button>
      </div>

      <!-- State display -->
      <div v-if="externalFilterState" style="padding: 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: #f9fafb;">
        <h4 style="margin: 0 0 0.5rem 0; font-weight: 600;">External State JSON:</h4>
        <pre style="margin: 0; padding: 0.75rem; background: white; border: 1px solid #d1d5db; border-radius: 0.25rem; overflow: auto; max-height: 200px; font-size: 0.75rem;">{{ JSON.stringify(externalFilterState, null, 2) }}</pre>
      </div>
    </div>

    <!-- Add other tabs here... -->
    <!-- Saved Filters Tab -->
    <div v-if="currentTab === 'saved'" style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="padding: 1rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background: #f9fafb;">
        <h3 style="margin: 0 0 0.5rem 0; font-weight: 600; color: #111827;">💾 Save & Load Filter Configurations</h3>
        <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">Create a filter below, give it a name, and save it to localStorage. You can then load it anytime!</p>
      </div>

      <!-- Instructions -->
      <div style="padding: 1rem; border: 1px solid #fbbf24; border-radius: 0.5rem; background: #fefbf2;">
        <h4 style="margin: 0 0 0.5rem 0; font-weight: 600; color: #92400e;">📋 How to Use:</h4>
        <ol style="margin: 0; padding-left: 1.25rem; color: #92400e; font-size: 0.875rem; line-height: 1.4;">
          <li>First, go to "Basic Usage & Controls" tab and create some filter conditions</li>
          <li>Return to this tab and enter a name for your filter</li>
          <li>Click "Save Current Filter" to store it</li>
          <li>Your saved filters will appear in the list below</li>
          <li>Click "Load" to restore any saved filter</li>
        </ol>
      </div>

      <!-- Save current filter -->
      <div style="padding: 1.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: white;">
        <h4 style="margin: 0 0 1rem 0; font-weight: 600;">💾 Save Current Filter</h4>
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem;">
          <input 
            v-model="filterName"
            placeholder="Enter filter name (e.g., 'VIP Customers', 'Active Users')..."
            style="flex: 1; min-width: 250px; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem;"
          />
          <button 
            @click="saveCurrentFilter"
            style="padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; background: #10b981; color: white; white-space: nowrap;"
          >
            💾 Save Filter
          </button>
        </div>
        
        <!-- Current filter preview -->
        <div style="padding: 0.75rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.375rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.875rem; color: #6b7280;">Current filter has:</span>
            <span style="font-size: 0.875rem; font-weight: 600; color: #111827;">{{ getCurrentFilterInfo() }}</span>
          </div>
        </div>
      </div>

      <!-- Saved filters list -->
      <div style="padding: 1.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="margin: 0; font-weight: 600;">📂 Your Saved Filters ({{ savedFilters.length }})</h4>
          <button 
            @click="loadSavedFilters"
            style="padding: 0.375rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background: white; font-size: 0.75rem; cursor: pointer;"
          >
            🔄 Refresh List
          </button>
        </div>
        
        <div v-if="savedFilters.length === 0" style="text-align: center; padding: 3rem; color: #6b7280; border: 2px dashed #d1d5db; border-radius: 0.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
          <h5 style="margin: 0 0 0.5rem 0; font-weight: 600;">No saved filters yet!</h5>
          <p style="margin: 0; font-size: 0.875rem;">Go to "Basic Usage & Controls" tab, create some filter conditions, then come back here to save them.</p>
        </div>
        
        <div v-else style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div 
            v-for="savedFilter in savedFilters" 
            :key="savedFilter.key"
            style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: #f9fafb; transition: all 0.2s;"
            @mouseover="$event.target.style.borderColor = '#3b82f6'"
            @mouseleave="$event.target.style.borderColor = '#e5e7eb'"
          >
            <div style="flex: 1;">
              <h5 style="margin: 0 0 0.25rem 0; font-weight: 600; color: #111827;">{{ savedFilter.name }}</h5>
              <p style="margin: 0; font-size: 0.75rem; color: #6b7280;">
                {{ savedFilter.filter.filters.length }} condition(s) • 
                Saved: {{ formatDate(savedFilter.timestamp) }}
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button 
                @click="loadSavedFilter(savedFilter)"
                style="padding: 0.5rem 0.75rem; border: none; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; background: #3b82f6; color: white;"
              >
                📂 Load
              </button>
              <button 
                @click="deleteSavedFilter(savedFilter)"
                style="padding: 0.5rem 0.75rem; border: none; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; background: #ef4444; color: white;"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

   
    <!-- Always-rendered Filter Component (hidden for non-interactive tabs) -->
    <div :style="{ 
      padding: '1rem', 
      border: '1px solid #d1d5db', 
      borderRadius: '0.5rem', 
      background: 'white',
      display: (currentTab === 'basic' || currentTab === 'external') ? 'block' : 'none'
    }">
      <VueVisualFilter
        ref="filterComponent"
        :filtering-options="filteringOptions"
        :model-value="currentTab === 'external' ? externalFilterState : null"
        @update:model-value="currentTab === 'external' ? (externalFilterState = $event) : null"
        @filter-update="captureFilterUpdate"
      />
    </div>
  </div>
</template>