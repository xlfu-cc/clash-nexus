<template>
  <div class="config-editor">
    <div class="page-header">
      <h1 class="page-title">配置管理</h1>
      <p class="page-description">编辑 Clash 配置文件，使用 @profile 语法标记不同场景的内容</p>
    </div>

    <!-- Config List -->
    <div class="card">
      <div v-if="isLoading && configs.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <template v-else>
        <div class="card-header">
          <h2 class="card-title">配置列表</h2>
          <button class="btn btn-primary" @click="showCreateModal = true">+ 新建配置</button>
        </div>

        <div v-if="configs.length === 0" class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>暂无配置，点击上方按钮创建</p>
        </div>

        <div v-else>
          <div v-for="config in configs" :key="config.id" class="list-item" :class="{ 'is-active': config.isActive }">
            <div class="list-item-info">
              <div class="list-item-title">
                {{ config.name }}
                <span v-if="config.isActive" class="badge badge-success">当前激活</span>
              </div>
              <div class="list-item-subtitle">更新于 {{ formatDate(config.updatedAt) }}</div>
            </div>
            <div class="list-item-actions">
              <button class="btn btn-secondary btn-sm" @click="editConfig(config)">编辑</button>
              <button v-if="!config.isActive" class="btn btn-secondary btn-sm" @click="activateConfig(config.id)">激活</button>
              <button class="btn btn-danger btn-sm" @click="deleteConfig(config.id)">删除</button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Editor Section -->
    <div v-if="editingConfig" class="card">
      <div class="card-header">
        <h2 class="card-title">编辑配置: {{ editingConfig.name }}</h2>
        <div class="flex gap-sm">
          <button class="btn btn-secondary" @click="cancelEdit">取消</button>
          <button class="btn btn-primary" @click="saveConfig">保存</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">配置名称</label>
        <input type="text" class="form-input" v-model="editingConfig.name" placeholder="输入配置名称" />
      </div>

      <div class="form-group">
        <label class="form-label">配置内容 (YAML)</label>
        <div class="editor-hint">提示: 使用 <code># @profile: xxx</code> 标记特定场景的配置</div>
        <YamlEditor v-model="editingConfig.content" />
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">新建配置</h3>
          <button class="modal-close" @click="showCreateModal = false">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-label">配置名称</label>
          <input type="text" class="form-input" v-model="newConfig.name" placeholder="例如: 主配置" />
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" @click="createConfig">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, onMounted, ref } from 'vue'
import { configApi } from '../api'
import YamlEditor from '../components/YamlEditor.vue'

export default {
  name: 'ConfigEditor',
  components: { YamlEditor },
  setup() {
    const showToast = inject('showToast')
    const configs = ref([])
    const editingConfig = ref(null)
    const showCreateModal = ref(false)
    const newConfig = ref({ name: '' })

    const isLoading = ref(true)

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

    const loadConfigs = async (options = {}) => {
      // Support both old signature (retries number) and new object signature
      const retries = typeof options === 'number' ? options : (options.retries ?? 3)
      const background = options.background || false

      if (!background) isLoading.value = true

      try {
        configs.value = await configApi.list()
        if (!background) isLoading.value = false
      } catch (error) {
        if (retries > 0) {
          console.log(`Failed to load configs, retrying... (${retries} left)`)
          await sleep(1000)
          return loadConfigs({ retries: retries - 1, background })
        }
        if (!background) isLoading.value = false
        showToast(error.message, 'error')
      }
    }

    const editConfig = async config => {
      try {
        editingConfig.value = await configApi.get(config.id)
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const cancelEdit = () => {
      editingConfig.value = null
    }

    const saveConfig = async () => {
      try {
        await configApi.update(editingConfig.value.id, {
          name: editingConfig.value.name,
          content: editingConfig.value.content
        })
        showToast('配置已保存')
        await loadConfigs({ background: true })
        editingConfig.value = null
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const createConfig = async () => {
      try {
        await configApi.create(newConfig.value.name, '')
        showToast('配置已创建')
        showCreateModal.value = false
        newConfig.value = { name: '' }
        await loadConfigs({ background: true })
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const activateConfig = async id => {
      try {
        await configApi.activate(id)
        showToast('配置已激活')
        await loadConfigs({ background: true })
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const deleteConfig = async id => {
      if (!confirm('确定要删除这个配置吗？')) return
      try {
        await configApi.delete(id)
        showToast('配置已删除')
        if (editingConfig.value?.id === id) {
          editingConfig.value = null
        }
        await loadConfigs({ background: true })
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const formatDate = dateStr => {
      return new Date(dateStr).toLocaleString('zh-CN')
    }

    onMounted(loadConfigs)

    return {
      configs,
      isLoading,
      editingConfig,
      showCreateModal,
      newConfig,
      editConfig,
      cancelEdit,
      saveConfig,
      createConfig,
      activateConfig,
      deleteConfig,
      formatDate
    }
  }
}
</script>

<style scoped>
.is-active {
  border-color: var(--color-success);
}

.editor-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-sm);
}

.editor-hint code {
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  color: var(--color-text-muted);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--color-bg-tertiary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-md);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
