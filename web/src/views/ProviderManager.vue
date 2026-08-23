<template>
  <div class="provider-manager">
    <div class="page-header">
      <h1 class="page-title">节点源管理</h1>
      <p class="page-description">
        管理外部代理订阅源 (Proxy Provider)。在「配置管理」中可通过 <code>use: [名称]</code> 直接引用，无需修改庞大的 YAML 配置文件。
      </p>
    </div>

    <!-- Provider List Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">节点源列表</h2>
        <div class="flex gap-sm">
          <button class="btn btn-secondary" :disabled="refreshingAll || isLoading" @click="handleRefreshAll">
            <span v-if="refreshingAll" class="btn-spinner"></span>
            <span v-else>🔄</span>
            一键刷新全部
          </button>
          <button class="btn btn-primary" @click="openCreateModal">+ 新建节点源</button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载节点源...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="providers.length === 0" class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>暂无节点源，点击右上角按钮添加外部机场/节点订阅</p>
      </div>

      <!-- Providers List -->
      <div v-else class="provider-list">
        <div v-for="provider in providers" :key="provider.id" class="provider-card">
          <div class="provider-main">
            <div class="provider-header-row">
              <div class="provider-name-wrap">
                <span class="provider-name">{{ provider.name }}</span>
                <span class="badge badge-type">{{ provider.type || 'http' }}</span>
                <span v-if="provider.status === 'ok'" class="badge badge-success"> 🟢 已同步 ({{ provider.proxyCount }} 节点) </span>
                <span v-else-if="provider.status === 'error'" class="badge badge-danger"> 🔴 同步失败 </span>
                <span v-else class="badge badge-warning"> ⚪ 未同步 </span>
              </div>
              <div class="provider-actions">
                <button
                  class="btn btn-secondary btn-sm"
                  :disabled="refreshingId === provider.id"
                  @click="handleRefreshSingle(provider)"
                  title="立即从上游拉取最新节点"
                >
                  <span v-if="refreshingId === provider.id" class="btn-spinner"></span>
                  <span v-else>🔄</span>
                  {{ refreshingId === provider.id ? '刷新中...' : '刷新' }}
                </button>
                <button class="btn btn-secondary btn-sm" @click="openEditModal(provider)">✏️ 编辑</button>
                <button class="btn btn-danger btn-sm" @click="handleDelete(provider)">🗑️ 删除</button>
              </div>
            </div>

            <!-- Provider URL -->
            <div class="provider-url-row">
              <span class="url-label">URL:</span>
              <code class="url-text" :title="provider.url">{{ provider.url }}</code>
              <button class="btn-copy-sm" @click="copyUrl(provider.url)" title="复制链接">📋</button>
            </div>

            <!-- Provider Meta Info -->
            <div class="provider-meta-row">
              <div class="meta-item">
                <span class="meta-label">更新周期:</span>
                <span class="meta-value">{{ provider.interval }} 秒 ({{ formatInterval(provider.interval) }})</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">最后同步:</span>
                <span class="meta-value">{{ provider.lastRefreshedAt ? formatDate(provider.lastRefreshedAt) : '从未同步' }}</span>
              </div>
            </div>

            <!-- Error message if any -->
            <div v-if="provider.lastError" class="provider-error-banner">⚠️ 同步错误: {{ provider.lastError }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Usage Guide Card -->
    <div class="card">
      <h2 class="card-title">📖 如何在配置中引用节点源</h2>
      <p class="text-secondary mb-md">添加节点源后，直接在「配置管理」的 YAML 中使用 <code>use: [节点源名称]</code> 即可自动合并并展开节点：</p>

      <div class="code-example">
        <pre><code># 示例：在配置管理中的 proxy-groups 下添加 use 字段
proxy-groups:
  - name: 节点选择
    type: select
    use:
      - <span class="highlight">{{ providers.length > 0 ? providers[0].name : 'my-provider' }}</span> # 直接填写上方定义的节点源名称

  - name: 自动选择
    type: url-test
    url: "http://www.gstatic.com/generate_204"
    interval: 300
    use:
      - <span class="highlight">{{ providers.length > 0 ? providers[0].name : 'my-provider' }}</span></code></pre>
      </div>

      <p class="text-muted mt-md" style="font-size: 0.8125rem">
        💡 提示：Clash Nexus 在客户端请求订阅时，会自动拉取节点源中的所有节点并将其展开合并至对应的策略组中，无需客户端单独管理外部 Provider 文件。
      </p>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '编辑节点源' : '新建节点源' }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="form-label">节点源标识名称 <span class="required">*</span></label>
            <input
              type="text"
              class="form-input"
              v-model="form.name"
              placeholder="例如: xsus, airport-1, sub-main"
              required
              pattern="[a-zA-Z0-9_\-]+"
              title="仅支持字母、数字、下划线和连字符"
            />
            <p class="form-hint">在配置文件的 proxy-groups 中使用 <code>use: [此名称]</code> 引用</p>
          </div>

          <div class="form-group">
            <label class="form-label">订阅源 URL <span class="required">*</span></label>
            <input type="url" class="form-input" v-model="form.url" placeholder="https://example.com/api/v1/client/subscribe?token=..." required />
            <p class="form-hint">支持 Clash 格式的 YAML 订阅链接或包含节点的订阅源</p>
          </div>

          <div class="form-group">
            <label class="form-label">缓存有效期 (秒)</label>
            <input type="number" class="form-input" v-model.number="form.interval" placeholder="3600" min="60" step="60" />
            <p class="form-hint">默认 3600 秒 (1小时)。在有效期内重复请求将优先使用本地缓存</p>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '保存中...' : isEditing ? '保存修改' : '立即创建' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, onMounted, ref } from 'vue'
import { providerApi } from '../api'
import { copyToClipboard } from '../utils/clipboard'

export default {
  name: 'ProviderManager',
  setup() {
    const showToast = inject('showToast')
    const providers = ref([])
    const isLoading = ref(true)
    const showModal = ref(false)
    const isEditing = ref(false)
    const submitting = ref(false)
    const refreshingId = ref(null)
    const refreshingAll = ref(false)

    const form = ref({
      id: '',
      name: '',
      url: '',
      interval: 3600,
      type: 'http'
    })

    const loadProviders = async (silent = false) => {
      if (!silent) isLoading.value = true
      try {
        providers.value = await providerApi.list()
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        if (!silent) isLoading.value = false
      }
    }

    const openCreateModal = () => {
      isEditing.value = false
      form.value = {
        id: '',
        name: '',
        url: '',
        interval: 3600,
        type: 'http'
      }
      showModal.value = true
    }

    const openEditModal = provider => {
      isEditing.value = true
      form.value = {
        id: provider.id,
        name: provider.name,
        url: provider.url,
        interval: provider.interval || 3600,
        type: provider.type || 'http'
      }
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
    }

    const handleSubmit = async () => {
      submitting.value = true
      try {
        if (isEditing.value) {
          await providerApi.update(form.value.id, {
            name: form.value.name,
            url: form.value.url,
            interval: form.value.interval,
            type: form.value.type
          })
          showToast(`节点源 "${form.value.name}" 更新成功`)
        } else {
          await providerApi.create({
            name: form.value.name,
            url: form.value.url,
            interval: form.value.interval,
            type: form.value.type
          })
          showToast(`节点源 "${form.value.name}" 创建成功，正在后台拉取节点`)
        }
        closeModal()
        await loadProviders(true)
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        submitting.value = false
      }
    }

    const handleDelete = async provider => {
      if (!confirm(`确定要删除节点源 "${provider.name}" 吗？如果配置中已引用它，生成订阅时将无法解析对应节点。`)) {
        return
      }

      try {
        await providerApi.delete(provider.id)
        showToast(`节点源 "${provider.name}" 已删除`)
        await loadProviders(true)
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const handleRefreshSingle = async provider => {
      refreshingId.value = provider.id
      try {
        const res = await providerApi.refresh(provider.id)
        if (res.success) {
          showToast(`"${provider.name}" 刷新成功，获取到 ${res.proxyCount} 个节点`)
        } else {
          showToast(`"${provider.name}" 刷新失败: ${res.error}`, 'error')
        }
        await loadProviders(true)
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        refreshingId.value = null
      }
    }

    const handleRefreshAll = async () => {
      refreshingAll.value = true
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

        showToast(`全部刷新完成: ${successCount}/${providers.value.length} 成功，共 ${totalProxies} 个节点`)
        await loadProviders(true)
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        refreshingAll.value = false
      }
    }

    const copyUrl = async url => {
      const success = await copyToClipboard(url)
      if (success) {
        showToast('URL 已复制到剪贴板')
      } else {
        showToast('复制失败', 'error')
      }
    }

    const formatDate = dateStr => {
      if (!dateStr) return '从未'
      return new Date(dateStr).toLocaleString('zh-CN')
    }

    const formatInterval = seconds => {
      if (!seconds) return '1小时'
      if (seconds < 60) return `${seconds}秒`
      if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
      const hours = (seconds / 3600).toFixed(1).replace('.0', '')
      return `${hours}小时`
    }

    onMounted(() => {
      loadProviders()
    })

    return {
      providers,
      isLoading,
      showModal,
      isEditing,
      submitting,
      refreshingId,
      refreshingAll,
      form,
      openCreateModal,
      openEditModal,
      closeModal,
      handleSubmit,
      handleDelete,
      handleRefreshSingle,
      handleRefreshAll,
      copyUrl,
      formatDate,
      formatInterval
    }
  }
}
</script>

<style scoped>
.provider-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.provider-card {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  transition: all var(--transition-fast);
}

.provider-card:hover {
  border-color: var(--color-primary);
}

.provider-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.provider-name-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.provider-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: 'JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
}

.badge-type {
  background: rgba(34, 184, 207, 0.15);
  color: var(--color-primary);
  text-transform: uppercase;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
}

.provider-actions {
  display: flex;
  gap: var(--space-sm);
}

.provider-url-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.url-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.url-text {
  flex: 1;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
}

.btn-copy-sm {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.btn-copy-sm:hover {
  background: var(--color-bg-hover);
}

.provider-meta-row {
  display: flex;
  gap: var(--space-lg);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  gap: 4px;
}

.meta-label {
  color: var(--color-text-muted);
}

.meta-value {
  color: var(--color-text-secondary);
}

.provider-error-banner {
  margin-top: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid var(--color-danger);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--color-danger);
  word-break: break-all;
}

.required {
  color: var(--color-danger);
}

.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}

.form-hint code {
  background: var(--color-bg-primary);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  color: var(--color-primary);
}

.code-example {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  overflow-x: auto;
}

.code-example pre {
  margin: 0;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.code-example .highlight {
  color: var(--color-warning);
  font-weight: bold;
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
