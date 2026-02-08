import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Views
import ConfigEditor from './views/ConfigEditor.vue'
import Subscribe from './views/Subscribe.vue'
import Login from './views/Login.vue'
import Settings from './views/Settings.vue'
import { getAdminToken } from './api'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { layout: 'clean' }
    },
    {
      path: '/',
      redirect: '/configs',
      meta: { requiresAuth: true }
    },
    {
      path: '/configs',
      name: 'configs',
      component: ConfigEditor,
      meta: { requiresAuth: true }
    },
    {
      path: '/subscribe',
      name: 'subscribe',
      component: Subscribe,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const hasToken = !!getAdminToken()

  if (to.meta.requiresAuth && !hasToken) {
    next('/login')
  } else if (to.path === '/login' && hasToken) {
    next('/')
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
