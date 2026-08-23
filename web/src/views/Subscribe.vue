<template>
  <div class="subscribe-page">
    <div class="page-header">
      <h1 class="page-title">订阅链接</h1>
      <p class="page-description">复制订阅链接到 Clash 客户端使用，支持携带参数强制刷新节点源</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">生成订阅链接</h2>
        <button class="btn btn-secondary btn-sm" :disabled="refreshingProviders" @click="handleRefreshAllProviders">
          <span v-if="refreshingProviders" class="btn-spinner"></span>
          <span v-else>🔄</span>
          立即更新后台节点源
        </button>
      </div>

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

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="forceRefresh" />
          <span>强制刷新节点源缓存 (URL 附带 <code>&refresh=1</code> 参数)</span>
        </label>
        <p class="form-hint">勾选后，Clash 客户端每次拉取订阅都会跳过本地缓存，强制从远程上游拉取最新节点</p>
      </div>

      <div class="subscribe-url-section">
        <label class="form-label">订阅链接</label>
        <div class="subscribe-url">{{ subscribeUrl }}</div>
        <div class="flex gap-sm flex-wrap">
          <button class="btn btn-primary" @click="copyUrl">📋 复制链接</button>
          <button class="btn btn-secondary" @click="openPreview">👁️ 预览配置</button>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="card">
      <h2 class="card-title">快速链接</h2>
      <p class="text-muted mb-md">以下是各 Profile 的订阅链接{{ forceRefresh ? '（已包含强制刷新参数）' : '' }}：</p>

      <div v-for="name in profiles" :key="name" class="quick-link-item">
        <div class="quick-link-info">
          <code>{{ name }}</code>
          <span v-if="forceRefresh" class="badge badge-warning">强制刷新</span>
        </div>
        <div class="flex gap-sm">
          <button class="copy-btn" @click="copyProfileUrl(name)">复制链接</button>
        </div>
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
          <p>选择对应的 Profile，根据需要勾选是否强制刷新，复制生成的订阅链接</p>
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
          <h4>更新与刷新</h4>
          <p>若节点有变动，可直接在后台「节点源管理」点击刷新，或使用带 <code>&refresh=1</code> 的订阅链接直接更新</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, inject, onMounted, ref } from 'vue'
import { generateSubscribeUrl, profileApi, subscribeApi, providerApi } from '../api'
import { copyToClipboard } from '../utils/clipboard'

export default {
  name: 'Subscribe',
  setup() {
    const showToast = inject('showToast')
    const profiles = ref([])
    const selectedProfile = ref('')
    const token = ref('')
    const forceRefresh = ref(false)
    const refreshingProviders = ref(false)

    const subscribeUrl = computed(() => {
      return generateSubscribeUrl(selectedProfile.value, token.value, forceRefresh.value)
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

    const handleRefreshAllProviders = async () => {
      refreshingProviders.value = true
      try {
        const res = await providerApi.refreshAll()
        let successCount = 0
        let totalProxies = 0

        if (Array.isArray(res.results)) {
          for (const item of res.results) {
            if (item.success) {
              successCount++
              totalProxies += item.proxyCount || 0
            }
          }
        }

        showToast(`节点源更新完成: ${successCount} 个成功，共 ${totalProxies} 个节点`)
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        refreshingProviders.value = false
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
      const url = generateSubscribeUrl(profileName, token.value, forceRefresh.value)
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
      forceRefresh,
      refreshingProviders,
      subscribeUrl,
      copyUrl,
      copyProfileUrl,
      openPreview,
      refreshToken,
      handleRefreshAllProviders
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text);
  user-select: none;
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.checkbox-label code {
  background: var(--color-bg-tertiary);
  color: var(--color-warning);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
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

.btn-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
