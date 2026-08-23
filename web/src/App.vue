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
        <router-link to="/configs" class="nav-item" :class="{ active: $route.path === '/configs' }"> 📝 配置管理 </router-link>
        <router-link to="/providers" class="nav-item" :class="{ active: $route.path === '/providers' }"> 📦 节点源管理 </router-link>
        <router-link to="/subscribe" class="nav-item" :class="{ active: $route.path === '/subscribe' }"> 📡 订阅链接 </router-link>
        <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }"> ⚙️ 系统设置 </router-link>
        <div class="nav-spacer"></div>
        <a href="#" class="nav-item logout-item" @click.prevent="handleLogout"> 🚪 登出系统 </a>
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
</style>
