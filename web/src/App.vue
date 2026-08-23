<template>
  <div v-if="isLoading" class="app-loading">
    <div class="spinner"></div>
  </div>
  <div v-else class="app-layout">
    <aside class="sidebar" v-if="!$route.meta.layout">
      <!-- Sidebar content -->
      <div class="sidebar-logo">
        <img src="/src/assets/logo.svg" alt="Logo" />
        <span>Clash Nexus</span>
      </div>
      <nav>
        <router-link to="/configs" class="nav-item" :class="{ active: $route.path === '/configs' }">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM8 8h8M8 12h8M8 16h5" />
          </svg>
          <span class="nav-label">配置管理</span>
        </router-link>
        <router-link to="/providers" class="nav-item" :class="{ active: $route.path === '/providers' }">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zm8 3.5v10M4.5 7.5 12 11l7.5-3.5" /></svg>
          <span class="nav-label">节点源</span>
        </router-link>
        <router-link to="/subscribe" class="nav-item" :class="{ active: $route.path === '/subscribe' }">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" />
          </svg>
          <span class="nav-label">订阅链接</span>
        </router-link>
        <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7.4-3.5a7.8 7.8 0 0 0-.1-1.2l2-1.55-2-3.46-2.4.97a8.3 8.3 0 0 0-2-1.16L14.5 3h-4l-.4 2.6a8.3 8.3 0 0 0-2 1.16l-2.4-.97-2 3.46 2 1.55a7.8 7.8 0 0 0 0 2.4l-2 1.55 2 3.46 2.4-.97a8.3 8.3 0 0 0 2 1.16l.4 2.6h4l.4-2.6a8.3 8.3 0 0 0 2-1.16l2.4.97 2-3.46-2-1.55c.07-.4.1-.8.1-1.2z"
            />
          </svg>
          <span class="nav-label">系统设置</span>
        </router-link>
        <div class="nav-spacer"></div>
        <a href="#" class="nav-item logout-item" @click.prevent="handleLogout">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" /></svg>
          <span class="nav-label">退出登录</span>
        </a>
      </nav>
    </aside>
    <main class="main-content" :class="{ 'full-width': $route.meta.layout === 'clean' }">
      <router-view />
    </main>

    <!-- Toast notification -->
    <div v-if="toast.show" class="toast" :class="'toast-' + toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { provide, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkSession, getAdminToken, logout } from './api'

export default {
  name: 'App',
  setup() {
    const router = useRouter()
    const isLoading = ref(true)
    const toast = ref({
      show: false,
      message: '',
      type: 'success'
    })

    const showToast = (message, type = 'success') => {
      toast.value = { show: true, message, type }
      setTimeout(() => {
        toast.value.show = false
      }, 3000)
    }

    // Provide toast function to all child components
    provide('showToast', showToast)

    onMounted(async () => {
      const token = getAdminToken()
      if (token) {
        const valid = await checkSession()
        if (!valid) {
          localStorage.removeItem('adminToken')
          if (router.currentRoute.value.meta.requiresAuth) {
            router.push('/login')
          }
        }
      }
      isLoading.value = false
    })

    const handleLogout = async () => {
      await logout()
    }

    return { toast, isLoading, handleLogout }
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

.app-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  background: var(--color-bg-primary);
}

.nav-spacer {
  flex-grow: 1;
}

.logout-item {
  margin-top: auto;
  color: var(--color-text-muted);
}

.logout-item:hover {
  color: var(--color-error, #ff4d4f);
  background: var(--color-error-light, rgba(255, 77, 79, 0.1));
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-bg-tertiary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .app-layout {
    display: block;
  }

  .sidebar {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    height: auto;
    padding: 0.45rem max(0.5rem, env(safe-area-inset-right)) calc(0.45rem + env(safe-area-inset-bottom)) max(0.5rem, env(safe-area-inset-left));
    border-top: 1px solid var(--color-border);
    border-right: 0;
    z-index: 100;
  }

  .sidebar-logo,
  .nav-spacer {
    display: none;
  }

  .sidebar nav {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.2rem;
  }

  .nav-item {
    min-height: 3.25rem;
    margin: 0;
    padding: 0.3rem 0.1rem;
    justify-content: center;
    gap: 0.1rem;
    flex-direction: column;
    font-size: 0.625rem;
    line-height: 1.1;
    text-align: center;
    white-space: nowrap;
  }

  .logout-item {
    margin-top: 0;
  }
}
</style>
