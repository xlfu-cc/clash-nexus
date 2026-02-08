<template>
  <div class="subscribe-page">
    <div class="page-header">
      <h1 class="page-title">订阅链接</h1>
      <p class="page-description">复制订阅链接到 Clash 客户端使用</p>
    </div>

    <div class="card">
      <h2 class="card-title">生成订阅链接</h2>

      <div class="form-group">
        <label class="form-label">选择 Profile</label>
        <select class="form-input" v-model="selectedProfile">
          <option value="">不指定 (返回公共配置)</option>
          <option v-for="name in profiles" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">订阅 Token</label>
        <div class="flex gap-sm">
          <input type="text" class="form-input" v-model="token" readonly placeholder="加载中..." />
          <button class="btn btn-secondary" @click="refreshToken" title="刷新 Token">🔄</button>
        </div>
        <p class="form-hint">Token 由系统自动生成，刷新后旧链接将失效</p>
      </div>

      <div class="subscribe-url-section">
        <label class="form-label">订阅链接</label>
        <div class="subscribe-url">{{ subscribeUrl }}</div>
        <div class="flex gap-sm">
          <button class="btn btn-primary" @click="copyUrl">📋 复制链接</button>
          <button class="btn btn-secondary" @click="openPreview">👁️ 预览配置</button>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="card">
      <h2 class="card-title">快速链接</h2>
      <p class="text-muted mb-md">以下是各 Profile 的订阅链接（需要替换 Token）：</p>

      <div v-for="name in profiles" :key="name" class="quick-link-item">
        <div class="quick-link-info">
          <code>{{ name }}</code>
        </div>
        <button class="copy-btn" @click="copyProfileUrl(name)">复制</button>
      </div>

      <div v-if="profiles.length === 0" class="empty-state">
        <p>暂无 Profile，请先在「配置管理」中使用 <code># @profile: 名称</code> 标记</p>
      </div>
    </div>

    <!-- Usage Guide -->
    <div class="card">
      <h2 class="card-title">使用方法</h2>

      <div class="usage-step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h4>复制订阅链接</h4>
          <p>选择对应的 Profile，填入 Token，复制生成的订阅链接</p>
        </div>
      </div>

      <div class="usage-step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h4>添加到 Clash</h4>
          <p>在 Clash 客户端中选择「配置」→「添加订阅」，粘贴链接</p>
        </div>
      </div>

      <div class="usage-step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h4>更新配置</h4>
          <p>Clash 会自动根据订阅链接更新配置内容</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, inject, onMounted, ref } from 'vue'
import { generateSubscribeUrl, profileApi, subscribeApi } from '../api'
import { copyToClipboard } from '../utils/clipboard'

export default {
  name: 'Subscribe',
  setup() {
    const showToast = inject('showToast')
    const profiles = ref([])
    const selectedProfile = ref('')
    const token = ref('')

    const subscribeUrl = computed(() => {
      return generateSubscribeUrl(selectedProfile.value, token.value)
    })

    const loadData = async () => {
      try {
        const [profilesData, tokenData] = await Promise.all([profileApi.list(), subscribeApi.getToken()])
        profiles.value = profilesData
        token.value = tokenData.token
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const refreshToken = async () => {
      if (!confirm('确定要重置订阅 Token 吗？旧的订阅链接将失效。')) return

      try {
        const data = await subscribeApi.rotateToken()
        token.value = data.token
        showToast('订阅 Token 已刷新')
      } catch (error) {
        showToast('Token 刷新失败', 'error')
      }
    }

    const copyUrl = async () => {
      if (!token.value) {
        showToast('数据尚未加载完成', 'warn')
        return
      }
      try {
        const success = await copyToClipboard(subscribeUrl.value)
        if (success) {
          showToast('链接已复制到剪贴板')
        } else {
          showToast('复制失败，请尝试手动复制', 'error')
        }
      } catch (error) {
        console.error('Clipboard error:', error)
        showToast('复制失败', 'error')
      }
    }

    const copyProfileUrl = async profileName => {
      if (!token.value) {
        showToast('数据尚未加载完成', 'warn')
        return
      }
      const url = generateSubscribeUrl(profileName, token.value)
      try {
        const success = await copyToClipboard(url)
        if (success) {
          showToast(`${profileName} 链接已复制`)
        } else {
          showToast('复制失败', 'error')
        }
      } catch (error) {
        console.error('Clipboard error:', error)
        showToast('复制失败', 'error')
      }
    }

    const openPreview = () => {
      window.open(subscribeUrl.value, '_blank')
    }

    onMounted(loadData)

    return {
      profiles,
      selectedProfile,
      token,
      subscribeUrl,
      copyUrl,
      copyProfileUrl,
      openPreview,
      refreshToken
    }
  }
}
</script>

<style scoped>
.subscribe-url-section {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}

.quick-link-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-sm);
}

.quick-link-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.quick-link-info code {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.usage-step {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.step-number {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content h4 {
  margin-bottom: var(--space-xs);
}

.step-content p {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
</style>
