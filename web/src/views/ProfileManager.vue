<template>
  <div class="profile-manager">
    <div class="page-header">
      <h1 class="page-title">Profile 管理</h1>
      <p class="page-description">管理不同场景的配置标识，用于订阅时根据场景返回对应内容</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Profile 列表</h2>
        <button class="btn btn-primary" @click="showModal = true">+ 新建 Profile</button>
      </div>

      <div v-if="profiles.length === 0" class="empty-state">
        <div class="empty-state-icon">👤</div>
        <p>暂无 Profile，点击上方按钮创建</p>
      </div>

      <div v-else>
        <div v-for="profile in profiles" :key="profile.id" class="list-item">
          <div class="list-item-info">
            <div class="list-item-title">
              <code>{{ profile.name }}</code>
            </div>
            <div class="list-item-subtitle">
              {{ profile.description || '无描述' }}
            </div>
          </div>
          <div class="list-item-actions">
            <button class="btn btn-secondary btn-sm" @click="editProfile(profile)">编辑</button>
            <button class="btn btn-danger btn-sm" @click="deleteProfile(profile.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Usage Guide -->
    <div class="card">
      <h2 class="card-title">使用方法</h2>
      <p class="mt-md text-muted">在配置文件中使用以下语法标记 Profile 专属内容：</p>

      <div class="code-example">
        <pre>
# 单行标记
- DOMAIN,example.com,PROXY  # @profile: home

# 块级标记
# @profile: office {
- DOMAIN,work.com,DIRECT
- DOMAIN,internal.com,DIRECT
# }

# 排除标记（除了该 profile 外都生效）
- DOMAIN,common.com,PROXY  # @profile: !home
        </pre>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '编辑' : '新建' }} Profile</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>

        <div class="form-group">
          <label class="form-label">Profile 名称</label>
          <input
            type="text"
            class="form-input"
            v-model="form.name"
            placeholder="例如: home, office, travel"
            :disabled="isEditing"
          />
          <p class="form-hint">只能包含字母、数字和下划线，必须以字母开头</p>
        </div>

        <div class="form-group">
          <label class="form-label">描述 (可选)</label>
          <input
            type="text"
            class="form-input"
            v-model="form.description"
            placeholder="例如: 家庭网络配置"
          />
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveProfile">
            {{ isEditing ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, inject, onMounted, computed } from 'vue'
import { profileApi } from '../api'

export default {
  name: 'ProfileManager',
  setup() {
    const showToast = inject('showToast')
    const profiles = ref([])
    const showModal = ref(false)
    const editingId = ref(null)
    const form = ref({ name: '', description: '' })

    const isEditing = computed(() => editingId.value !== null)

    const loadProfiles = async () => {
      try {
        profiles.value = await profileApi.list()
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const editProfile = profile => {
      editingId.value = profile.id
      form.value = { name: profile.name, description: profile.description }
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      editingId.value = null
      form.value = { name: '', description: '' }
    }

    const saveProfile = async () => {
      try {
        if (isEditing.value) {
          await profileApi.update(editingId.value, {
            description: form.value.description
          })
          showToast('Profile 已更新')
        } else {
          await profileApi.create(form.value.name, form.value.description)
          showToast('Profile 已创建')
        }
        closeModal()
        await loadProfiles()
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    const deleteProfile = async id => {
      if (!confirm('确定要删除这个 Profile 吗？')) return
      try {
        await profileApi.delete(id)
        showToast('Profile 已删除')
        await loadProfiles()
      } catch (error) {
        showToast(error.message, 'error')
      }
    }

    onMounted(loadProfiles)

    return {
      profiles,
      showModal,
      form,
      isEditing,
      editProfile,
      closeModal,
      saveProfile,
      deleteProfile
    }
  }
}
</script>

<style scoped>
.list-item-title code {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.code-example {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-top: var(--space-md);
  overflow-x: auto;
}

.code-example pre {
  margin: 0;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.form-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}
</style>
