<template>
  <div class="login-container">
    <div class="login-card card">
      <div class="logo">
        <img src="/src/assets/logo.svg" alt="Logo" width="64" height="64" />
        <div class="logo-text">Clash Nexus</div>
      </div>
      <h2 class="page-title text-center">Admin Login</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input type="text" id="username" v-model="username" class="form-input" placeholder="Enter username" required autofocus autocomplete="username" />
        </div>
        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input type="password" id="password" v-model="password" class="form-input" placeholder="Enter password" required autocomplete="current-password" />
        </div>
        <button type="submit" :disabled="loading" class="btn btn-primary login-btn">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const username = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')

    const handleLogin = async () => {
      if (!username.value || !password.value) return

      loading.value = true
      error.value = ''

      try {
        await login(username.value, password.value)
        router.push('/')
      } catch (err) {
        error.value = err.message || 'Login failed'
      } finally {
        loading.value = false
      }
    }

    return {
      username,
      password,
      loading,
      error,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--color-bg);
  padding: var(--space-lg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: var(--space-xl);
}

.logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-lg);
  gap: var(--space-sm);
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-title {
  font-size: 1.5rem;
  margin-bottom: var(--space-lg);
}

.login-btn {
  width: 100%;
  margin-top: var(--space-md);
}

.error-message {
  margin-top: var(--space-md);
  color: var(--color-danger);
  font-size: 0.875rem;
  text-align: center;
}
</style>
