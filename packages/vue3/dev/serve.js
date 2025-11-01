import { createApp, h } from "vue"

import VueVisualFilter from "@/main.js"

import Serve from "./Serve.vue"
import EnhancedDemo from "./EnhancedDemo.vue"

// Choose which demo to run based on URL parameter
// Use: http://localhost:8081/?demo=enhanced
const urlParams = new URLSearchParams(window.location.search)
const Demo = urlParams.get('demo') === 'enhanced' ? EnhancedDemo : Serve

createApp({
  render: () => h(Demo),
})
  .use(VueVisualFilter)
  .mount("#app")
