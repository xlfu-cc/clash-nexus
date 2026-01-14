<template>
  <div class="provider-manager">
    <div class="page-header">
      <h1 class="page-title">订阅源管理</h1>
      <p class="page-description">管理外部订阅链接，自动导入代理节点</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">订阅源列表</h2>
        <button class="btn btn-primary" @click="showModal = true">+ 添加订阅源</button>
      </div>

      <div v-if="providers.length === 0" class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <p>暂无订阅源，点击上方按钮添加</p>
      </div>

      <div v-else>
        <div v-for="provider in providers" :key="provider.id" class="list-item">
          <div class="list-item-info">
            <div class="list-item-title">{{ provider.name }}</div>
            <div class="list-item-subtitle">
              {{ provider.url }}
            </div>
            <div class="list-item-meta">
              <span class="badge badge-warning">
                每 {{ formatInterval(provider.interval) }} 更新
              </span>
              <span v-if="provider.lastUpdate" class="text-muted">
                上次更新: {{ formatDate(provider.lastUpdate) }}
              </span>
            </div>
          </div>
          <div class="list-item-actions">
            <button
              class="btn btn-secondary btn-sm"
              @click="refreshProvider(provider.id)"
              :disabled="refreshing === provider.id"
            >
              {{ refreshing === provider.id ? '刷新中...' : '刷新' }}
            </button>
            <button class="btn btn-secondary btn-sm" @click="editProvider(provider)">编辑</button>
            <button class="btn btn-danger btn-sm" @click="deleteProvider(provider.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '编辑' : '添加' }}订阅源</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>

        <div class="form-group">
          <label class="form-label">名称</label>
          <input type="text" class="form-input" v-model="form.name" placeholder="例如: 机场A" />
        </div>

        <div class="form-group">
          <label class="form-label">订阅链接</label>
          <input type="url" class="form-input" v-model="form.url" placeholder="https://..." />
        </div>

        <div class="form-group">
          <label class="form-label">更新间隔 (秒)</label>
          <input
            type="number"
            class="form-input"
            v-model.number="form.interval"
            min="300"
            placeholder="3600"
          />
          <p class="form-hint">最小 300 秒 (5 分钟)，建议 3600 秒 (1 小时)</p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveProvider">
            {{ isEditing ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, inject, onMounted, computed } from 'vue'
import { providerApi } from '../api'

export default {
  name: 'ProviderManager',
  setup() {
    const showToast = inject('showToast')
    const providers = ref([])
    const showModal = ref(false)
    const editingId = ref(null)
    const refreshing = ref(null)
    const form = ref({ name: '', url: '', interval: 3600 })

    const isEditing = computed(() => editingId.value !== null)

    const loadProviders = async () => {
      try {
        providers.value = await providerApi.list()
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const editProvider = provider => {
      editingId.value = provider.id
      form.value = {
        name: provider.name,
        url: provider.url,
        interval: provider.interval
      }
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      editingId.value = null
      form.value = { name: '', url: '', interval: 3600 }
    }

    const saveProvider = async () => {
      try {
        if (isEditing.value) {
          await providerApi.update(editingId.value, form.value)
          showToast('订阅源已更新')
        } else {
          await providerApi.create(form.value.name, form.value.url, form.value.interval)
          showToast('订阅源已添加')
        }
        closeModal()
        await loadProviders()
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const deleteProvider = async id => {
      if (!confirm('确定要删除这个订阅源吗？')) return
      try {
        await providerApi.delete(id)
        showToast('订阅源已删除')
        await loadProviders()
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const refreshProvider = async id => {
      refreshing.value = id
      try {
        await providerApi.refresh(id)
        showToast('订阅源已刷新')
        await loadProviders()
      } catch (error) {
        showToast(error.message, 'error')
      } finally {
        refreshing.value = null
      }
    }

    const formatInterval = seconds => {
      if (seconds >= 3600) {
        return `${Math.floor(seconds / 3600)} 小时`
      }
      return `${Math.floor(seconds / 60)} 分钟`
    }

    const formatDate = dateStr => {
      return new Date(dateStr).toLocaleString('zh-CN')
    }

    onMounted(loadProviders)

    return {
      providers,
      showModal,
      form,
      isEditing,
      refreshing,
      editProvider,
      closeModal,
      saveProvider,
      deleteProvider,
      refreshProvider,
      formatInterval,
      formatDate
    }
  }
}
</script>

<style scoped>
.list-item-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-sm);
  font-size: 0.75rem;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}
</style>
