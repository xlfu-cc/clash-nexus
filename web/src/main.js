import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Views
import ConfigEditor from './views/ConfigEditor.vue'
import ProfileManager from './views/ProfileManager.vue'
import ProviderManager from './views/ProviderManager.vue'
import Subscribe from './views/Subscribe.vue'

// Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/configs' },
    { path: '/configs', name: 'configs', component: ConfigEditor },
    { path: '/profiles', name: 'profiles', component: ProfileManager },
    { path: '/providers', name: 'providers', component: ProviderManager },
    { path: '/subscribe', name: 'subscribe', component: Subscribe }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
