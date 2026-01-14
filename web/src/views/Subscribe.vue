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
          <option v-for="profile in profiles" :key="profile.id" :value="profile.name">
            {{ profile.name }} - {{ profile.description }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">订阅 Token</label>
        <input type="text" class="form-input" v-model="token" placeholder="输入你的订阅 Token" />
        <p class="form-hint">Token 配置在服务端的 SUBSCRIBE_TOKEN 环境变量中</p>
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

      <div v-for="profile in profiles" :key="profile.id" class="quick-link-item">
        <div class="quick-link-info">
          <code>{{ profile.name }}</code>
          <span class="text-muted">{{ profile.description }}</span>
        </div>
        <button class="copy-btn" @click="copyProfileUrl(profile.name)">复制</button>
      </div>

      <div v-if="profiles.length === 0" class="empty-state">
        <p>暂无 Profile，请先在 Profile 管理中创建</p>
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
import { ref, computed, inject, onMounted } from 'vue'
import { profileApi, generateSubscribeUrl } from '../api'

export default {
  name: 'Subscribe',
  setup() {
    const showToast = inject('showToast')
    const profiles = ref([])
    const selectedProfile = ref('')
    const token = ref('dev-subscribe-token')

    const subscribeUrl = computed(() => {
      return generateSubscribeUrl(selectedProfile.value, token.value)
    })

    const loadProfiles = async () => {
      try {
        profiles.value = await profileApi.list()
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const copyUrl = async () => {
      try {
        await navigator.clipboard.writeText(subscribeUrl.value)
        showToast('链接已复制到剪贴板')
      } catch (error) {
        showToast('复制失败，请手动复制', 'error')
      }
    }

    const copyProfileUrl = async profileName => {
      const url = generateSubscribeUrl(profileName, token.value)
      try {
        await navigator.clipboard.writeText(url)
        showToast(`${profileName} 链接已复制`)
      } catch (error) {
        showToast('复制失败', 'error')
      }
    }

    const openPreview = () => {
      window.open(subscribeUrl.value, '_blank')
    }

    onMounted(loadProfiles)

    return {
      profiles,
      selectedProfile,
      token,
      subscribeUrl,
      copyUrl,
      copyProfileUrl,
      openPreview
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
