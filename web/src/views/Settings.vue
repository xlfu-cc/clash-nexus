<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
    </div>

    <div class="card">
      <h2 class="card-title">修改密码</h2>
      <form @submit.prevent="handleChangePassword">
        <div class="form-group">
          <label class="form-label">当前密码</label>
          <input type="password" class="form-input" v-model="oldPassword" required />
        </div>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input type="password" class="form-input" v-model="newPassword" required minlength="6" />
        </div>
        <div class="form-group">
          <label class="form-label">确认新密码</label>
          <input type="password" class="form-input" v-model="confirmPassword" required minlength="6" />
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? '修改中...' : '确认修改' }}
          </button>
        </div>
      </form>
    </div>

    <div class="card" style="margin-top: 20px">
      <h2 class="card-title">修改用户名</h2>
      <form @submit.prevent="handleUpdateUsername">
        <div class="form-group">
          <label class="form-label">新用户名</label>
          <input type="text" class="form-input" v-model="newUsername" required minlength="3" />
          <p class="form-hint">修改成功后需要重新登录</p>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="usernameLoading">
            {{ usernameLoading ? '修改中...' : '确认修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, inject } from 'vue'
import { changePassword, updateUsername } from '../api'

export default {
  name: 'Settings',
  setup() {
    const showToast = inject('showToast')
    const oldPassword = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const loading = ref(false)

    const handleChangePassword = async () => {
      if (newPassword.value !== confirmPassword.value) {
        showToast('两次输入的密码不一致', 'error')
        return
      }

      loading.value = true
      try {
        await changePassword(oldPassword.value, newPassword.value)
        showToast('密码修改成功，请重新登录')
        setTimeout(() => {
          localStorage.removeItem('adminToken')
          window.location.href = '/login'
        }, 1500)
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const usernameLoading = ref(false)
    const newUsername = ref('')

    const handleUpdateUsername = async () => {
      if (!confirm(`确定要将用户名修改为 "${newUsername.value}" 吗？修改后需要重新登录。`)) return

      usernameLoading.value = true
      try {
        await updateUsername(newUsername.value)
        showToast('用户名修改成功，请重新登录')
        setTimeout(() => {
          localStorage.removeItem('adminToken')
          window.location.href = '/login'
        }, 1500)
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        usernameLoading.value = false
      }
    }

    return {
      oldPassword,
      newPassword,
      confirmPassword,
      loading,
      handleChangePassword,
      newUsername,
      usernameLoading,
      handleUpdateUsername
    }
  }
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-lg);
}
</style>
