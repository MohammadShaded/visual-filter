import VueVisualFilter from "./VueVisualFilter/index.vue"
import "./index.css"

// Export utilities for advanced usage
export * from "./utils.js"

// Export types from common package for convenience
export { FilterType, GroupType, DataType } from "@visual-filter/common"

// Export our extended DataType that includes DATE support
export { ExtendedDataType } from "./utils.js"

VueVisualFilter.install = (app) => {
  app.component(VueVisualFilter.name, VueVisualFilter)
}

export default VueVisualFilter
