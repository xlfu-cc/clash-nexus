<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span>⚡ Clash Nexus</span>
      </div>
      <nav>
        <router-link to="/configs" class="nav-item" :class="{ active: $route.path === '/configs' }">
          📝 配置管理
        </router-link>
        <router-link
          to="/profiles"
          class="nav-item"
          :class="{ active: $route.path === '/profiles' }"
        >
          👤 Profile 管理
        </router-link>
        <router-link
          to="/providers"
          class="nav-item"
          :class="{ active: $route.path === '/providers' }"
        >
          🔗 订阅源管理
        </router-link>
        <router-link
          to="/subscribe"
          class="nav-item"
          :class="{ active: $route.path === '/subscribe' }"
        >
          📡 订阅链接
        </router-link>
      </nav>
    </aside>
    <main class="main-content">
      <router-view />
    </main>

    <!-- Toast notification -->
    <div v-if="toast.show" class="toast" :class="'toast-' + toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { ref, provide } from 'vue'

export default {
  name: 'App',
  setup() {
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

    return { toast }
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}
</style>
