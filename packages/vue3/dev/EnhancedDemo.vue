<script>
import { 
  createEmptyFilter, 
  createPresetFilter, 
  FilterStateStorage, 
  encodeFilterStateForURL, 
  decodeFilterStateFromURL,
  FilterType,
  GroupType,
  DataType
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
        },
      },
      
      // UI state
      currentTab: 'basic',
      filterName: '',
      showHistory: false,
      shareableLink: '',
    }
  },
  
  computed: {
    historyInfo() {
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
    },
    
    // Reset functionality
    resetFilter() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.reset()
        this.updateShareableLink()
      }
    },
    
    // Undo/Redo functionality
    undoFilter() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.undo()
        this.updateShareableLink()
      }
    },
    
    redoFilter() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.redo()
        this.updateShareableLink()
      }
    },
    
    clearHistory() {
      if (this.$refs.filterComponent) {
        this.$refs.filterComponent.clearHistory()
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
      <button 
        @click="currentTab = 'presets'"
        :style="{ 
          padding: '0.75rem 1rem', 
          border: 'none', 
          background: 'none', 
          color: currentTab === 'presets' ? '#3b82f6' : '#6b7280',
          fontWeight: '500',
          cursor: 'pointer',
          borderBottom: currentTab === 'presets' ? '2px solid #3b82f6' : '2px solid transparent',
          transition: 'all 0.2s'
        }"
      >
        Preset Filters
      </button>
      <button 
        @click="currentTab = 'sharing'"
        :style="{ 
          padding: '0.75rem 1rem', 
          border: 'none', 
          background: 'none', 
          color: currentTab === 'sharing' ? '#3b82f6' : '#6b7280',
          fontWeight: '500',
          cursor: 'pointer',
          borderBottom: currentTab === 'sharing' ? '2px solid #3b82f6' : '2px solid transparent',
          transition: 'all 0.2s'
        }"
      >
        URL Sharing
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

      <!-- Filter component -->
      <div style="padding: 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: white;">
        <VueVisualFilter
          ref="filterComponent"
          :filtering-options="filteringOptions"
          @filter-update="captureFilterUpdate"
        />
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

      <!-- Filter component with v-model -->
      <div style="padding: 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: white;">
        <VueVisualFilter
          ref="filterComponent"
          :filtering-options="filteringOptions"
          v-model="externalFilterState"
          @filter-update="captureFilterUpdate"
        />
      </div>
    </div>

    <!-- Add other tabs here... -->
    <div v-if="currentTab === 'saved'" style="text-align: center; padding: 2rem; color: #6b7280;">
      <p>Saved Filters tab - Implementation would go here</p>
      <p>This would show localStorage save/load functionality</p>
    </div>

    <div v-if="currentTab === 'presets'" style="text-align: center; padding: 2rem; color: #6b7280;">
      <p>Preset Filters tab - Implementation would go here</p>
      <p>This would show pre-configured filter examples</p>
    </div>

    <div v-if="currentTab === 'sharing'" style="text-align: center; padding: 2rem; color: #6b7280;">
      <p>URL Sharing tab - Implementation would go here</p>
      <p>This would show URL encoding/decoding functionality</p>
    </div>
  </div>
</template>