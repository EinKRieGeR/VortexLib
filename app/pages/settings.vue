<template>
  <div class="page-container">
    <div class="settings-layout">
      <!-- Sidebar -->
      <aside class="settings-sidebar fade-in">
        <h1 class="settings-title">Управление</h1>
        <div class="settings-nav">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            class="nav-item" 
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.label }}</span>
          </button>
        </div>

        <div class="sidebar-footer">
          <div class="footer-version">VortexLib v1.2</div>
          <div class="footer-user">
            <span class="role-dot admin"></span>
            {{ user?.username }}
          </div>
        </div>
      </aside>

      <!-- Content area -->
      <main class="settings-content fade-in">
        <!-- TAB: LIBRARY -->
        <div v-if="activeTab === 'library'" class="tab-pane">
          <h2 class="pane-title">📚 Настройки библиотеки</h2>
          
          <div class="stats-grid" style="margin-bottom: 32px;">
            <div class="card stat-card">
              <span class="stat-label">Всего книг</span>
              <span class="stat-value">{{ statsData?.totalBooks?.toLocaleString('ru') || 0 }}</span>
            </div>
            <div class="card stat-card">
              <span class="stat-label">Последний импорт</span>
              <span class="stat-value" style="font-size: 1rem;">{{ lastImportDate || '—' }}</span>
            </div>
          </div>

          <div class="card section-card">
            <h3>📁 Расположение файлов</h3>
            <div class="input-row">
              <input 
                type="text" 
                v-model="libraryPath" 
                class="input" 
                placeholder="/path/to/library"
              />
              <button class="btn btn-primary" @click="saveSettings" :disabled="savingSettings">
                {{ savingSettings ? '...' : 'Сохранить' }}
              </button>
            </div>
            <p class="helper-text">Укажите основной путь. VortexLib найдет все .inpx файлы рекурсивно.</p>
          </div>

          <div class="card section-card">
            <h3>🔄 Операции с базой</h3>
            
            <div v-if="importStatus?.inProgress" class="import-progress">
              <div class="progress-info">
                <span>{{ importStatus.progress?.message }}</span>
                <span class="percent">{{ importStatus.progress?.progress }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: importStatus.progress?.progress + '%' }"></div>
              </div>
            </div>

            <div class="detail-row">
              <label>Размер чанка импорта</label>
              <select class="select" v-model="chunkSize">
                <option v-for="size in chunkSizes" :key="size" :value="size">{{ size.toLocaleString() }}</option>
              </select>
            </div>

            <div class="actions-row">
              <button class="btn btn-primary" @click="startImport" :disabled="importing || importStatus?.inProgress">
                {{ importing ? 'Запуск...' : '🔄 Обновить библиотеку' }}
              </button>
              <button class="btn btn-secondary" @click="confirmClear" :disabled="importing || importStatus?.inProgress">
                🗑️ Очистить базу
              </button>
            </div>
          </div>
        </div>

        <!-- TAB: USERS -->
        <div v-if="activeTab === 'users'" class="tab-pane">
          <div class="pane-header">
            <h2 class="pane-title">👥 Управление пользователями</h2>
            <button class="btn btn-primary" @click="showAddUser = true">➕ Новый пользователь</button>
          </div>

          <div class="card users-card">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Дата создания</th>
                  <th style="text-align: right;">Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in usersList" :key="u.id">
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar">{{ u.username[0].toUpperCase() }}</div>
                      <div class="user-info">
                        <span class="user-name">{{ u.username }}</span>
                        <span v-if="u.id === user?.id" class="badge-self">Это вы</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="role-badge" :class="u.role">{{ translateRole(u.role) }}</span>
                  </td>
                  <td class="date-cell">{{ formatDate(u.created_at) }}</td>
                  <td style="text-align: right;">
                    <div class="user-actions">
                      <button class="icon-btn" title="Редактировать" @click="editUser(u)">✏️</button>
                      <button 
                        class="icon-btn delete" 
                        title="Удалить" 
                        @click="deleteUser(u.id)"
                        :disabled="u.id === user?.id"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: SYSTEM -->
        <div v-if="activeTab === 'system'" class="tab-pane">
          <h2 class="pane-title">⚙️ Системная информация</h2>
          <div class="card section-card">
            <div class="info-grid">
              <div class="info-item">
                <label>Окружение</label>
                <span>Production (Local)</span>
              </div>
              <div class="info-item">
                <label>База данных</label>
                <span>SQLite 3 (Walking)</span>
              </div>
              <div class="info-item">
                <label>Версия движка</label>
                <span>Nuxt 4 / Nitro</span>
              </div>
              <div class="info-item">
                <label>Порт</label>
                <span>4224</span>
              </div>
            </div>
          </div>

          <div class="card section-card" style="text-align: center; padding: 40px;">
             <div style="font-size: 2.5rem; margin-bottom: 20px;">🌌</div>
             <h3 style="margin-bottom: 8px;">VortexLib</h3>
             <p style="color: var(--text-muted); margin-bottom: 24px;">Локальная цифровая библиотека книг.</p>
             
             <div style="border-top: 1px solid var(--border-color); padding-top: 24px;">
               <p style="font-size: 0.875rem; color: var(--text-secondary);">
                 Разработано <span style="color: var(--accent-secondary); font-weight: 700;">EinKRieGeR</span>
               </p>
               <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
                 © 2026 VortexLib. GNU GPL v3 License.
               </p>
               <div style="margin-top: 20px;">
                 <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License">
               </div>
             </div>
          </div>
        </div>
      </main>
    </div>

    <!-- MODAL: ADD USER -->
    <div v-if="showAddUser || editingUserData" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card fade-in">
        <h3>{{ editingUserData ? 'Редактирование' : 'Новый пользователь' }}</h3>
        <form @submit.prevent="saveUser">
          <div class="input-group">
            <label>Логин</label>
            <input type="text" v-model="userForm.username" class="input" required />
          </div>
          <div class="input-group">
            <label>Пароль ({{ editingUserData ? 'оставьте пустым для сохранения' : 'минимум 4 символа' }})</label>
            <input type="password" v-model="userForm.password" class="input" :required="!editingUserData" />
          </div>
          <div class="input-group">
            <label>Роль</label>
            <select class="select" v-model="userForm.role">
              <option value="user">Пользователь (Чтение)</option>
              <option value="moderator">Модератор (Управление книгами)</option>
              <option value="admin">Администратор (Полный доступ)</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">Отмена</button>
            <button type="submit" class="btn btn-primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
if (import.meta.client && (!user.value || user.value.role !== 'admin')) {
  useRouter().push('/')
}

const activeTab = ref('library')
const tabs = [
  { id: 'library', label: 'Библиотека', icon: '📚' },
  { id: 'users', label: 'Пользователи', icon: '👥' },
  { id: 'system', label: 'Система', icon: '⚙️' },
]

// Library Logic
const importing = ref(false)
const importStatus = ref<any>(null)
let pollInterval: any = null
const chunkSizes = [1000, 5000, 25000, 50000, 100000]
const chunkSize = ref(5000)
const libraryPath = ref('')
const savingSettings = ref(false)

const { data: statsData, refresh: refreshStats } = await useFetch('/api/stats', { server: false })
const { data: serverSettings } = await useFetch('/api/settings', { server: false })

if (serverSettings.value) {
  libraryPath.value = serverSettings.value.libraryPath || ''
}

const lastImportDate = computed(() => {
  if (!statsData.value?.importStatus?.imported_at) return null
  return new Date(statsData.value.importStatus.imported_at).toLocaleString('ru')
})

async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch('/api/settings', { method: 'POST', body: { libraryPath: libraryPath.value } })
    alert('Настройки сохранены!')
  } catch { alert('Ошибка!') } finally { savingSettings.value = false }
}

async function startImport() {
  importing.value = true
  try {
    await $fetch('/api/import?chunkSize=' + chunkSize.value, { method: 'POST' })
    startPolling()
  } catch { importing.value = false }
}

async function startPolling() {
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(async () => {
    const data: any = await $fetch('/api/import')
    importStatus.value = data
    if (!data.inProgress) {
      clearInterval(pollInterval)
      refreshStats()
    }
  }, 2000)
}

async function confirmClear() {
  if (confirm('Очистить базу?')) {
    await $fetch('/api/import?action=clear', { method: 'POST' })
    refreshStats()
  }
}

// User Management Logic
const { data: usersList, refresh: refreshUsers } = await useFetch<any[]>('/api/users', { server: false })
const showAddUser = ref(false)
const editingUserData = ref<any>(null)
const userForm = ref({ username: '', password: '', role: 'user' })

function translateRole(r: string) {
  return { admin: 'Админ', moderator: 'Модератор', user: 'Пользователь' }[r] || r
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru')
}

function closeModal() {
  showAddUser.value = false
  editingUserData.value = null
  userForm.value = { username: '', password: '', role: 'user' }
}

function editUser(u: any) {
  editingUserData.value = u
  userForm.value = { username: u.username, password: '', role: u.role }
}

async function saveUser() {
  try {
    if (editingUserData.value) {
      await $fetch(`/api/users/${editingUserData.value.id}`, { method: 'PUT', body: userForm.value })
    } else {
      await $fetch('/api/users', { method: 'POST', body: userForm.value })
    }
    refreshUsers()
    closeModal()
  } catch (e: any) {
    alert(e.data?.message || 'Ошибка')
  }
}

async function deleteUser(id: number) {
  if (confirm('Удалить пользователя?')) {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    refreshUsers()
  }
}

onMounted(() => {
  $fetch('/api/import').then(data => {
    importStatus.value = data
    if ((data as any).inProgress) startPolling()
  })
})
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })

</script>

<style scoped>
.settings-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  min-height: 70vh;
}

.settings-sidebar {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
}

.settings-title {
  font-size: 1.25rem;
  margin-bottom: 24px;
  padding-left: 12px;
  color: var(--text-primary);
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: rgba(255,255,255,0.05);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-primary);
  color: #fff;
}

.nav-icon { font-size: 1.25rem; }
.nav-label { font-weight: 500; font-size: 0.9375rem; }

.sidebar-footer {
  margin-top: 24px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.footer-version { font-size: 0.75rem; color: var(--text-muted); }
.footer-user { 
  margin-top: 8px; 
  font-size: 0.8125rem; 
  display: flex; 
  align-items: center; 
  gap: 8px; 
}

.role-dot { width: 6px; height: 6px; border-radius: 50%; }
.role-dot.admin { background: #ffd700; box-shadow: 0 0 6px #ffd700; }

.settings-content {
  min-width: 0;
}

.pane-title {
  font-size: 1.5rem;
  margin-bottom: 32px;
}

.section-card {
  padding: 24px;
  margin-bottom: 24px;
}

.section-card h3 {
  font-size: 1.125rem;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.input-row {
  display: flex;
  gap: 12px;
}

.input-row .input { flex: 1; }

.helper-text {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 8px;
}

.actions-row {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

/* Users Table */
.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.pane-header .pane-title { margin-bottom: 0; }

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.8125rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color);
}

.users-table td {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--accent-secondary);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}

.user-name { font-weight: 600; display: block; }

.badge-self {
  font-size: 0.625rem;
  background: rgba(255,255,255,0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}

.role-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
}

.role-badge.admin { background: rgba(255, 215, 0, 0.1); color: #ffd700; }
.role-badge.moderator { background: rgba(52, 152, 219, 0.1); color: #3498db; }
.role-badge.user { background: rgba(149, 165, 166, 0.1); color: #95a5a6; }

.date-cell { font-size: 0.875rem; color: var(--text-muted); }

.user-actions { display: flex; justify-content: flex-end; gap: 8px; }

.icon-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.05);
  border-color: var(--text-muted);
}

.icon-btn.delete:hover { border-color: #ff4d4d; }

.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 100%;
  max-width: 450px;
  padding: 32px;
}

.modal-card h3 { margin-bottom: 24px; }

.input-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.info-item label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.info-item span { font-weight: 500; font-family: var(--font-mono); font-size: 0.9375rem; }

.import-progress {
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

@media (max-width: 900px) {
  .settings-layout { grid-template-columns: 1fr; }
}
</style>
