<template>
  <div class="page-container">
    <h1 class="section-title fade-in">Настройки системы</h1>
    <p class="section-subtitle fade-in">Управление библиотекой и параметрами импорта</p>

    <div class="stats-grid fade-in">
      <div class="card">
        <h3 style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 8px;">Последний импорт</h3>
        <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-secondary);">
          {{ lastImportDate || 'Никогда' }}
        </div>
      </div>
      <div class="card">
        <h3 style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 8px;">Книг в базе</h3>
        <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-primary);">
          {{ statsData?.totalBooks?.toLocaleString('ru') || 0 }}
        </div>
      </div>
    </div>

    
    <div class="card fade-in" style="margin-top: 24px;">
      <h2 style="font-size: 1.25rem; margin-bottom: 16px;">📚 Импорт базы данных</h2>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">
        Вы можете запустить полное сканирование вашей библиотеки. Система автоматически проверит файлы на дубликаты (по ID книги) и обновит информацию или добавит новые книги.
      </p>

      
      <div v-if="importStatus?.inProgress" style="margin-bottom: 24px;">
        <div class="flex justify-between items-center mb-4">
          <span style="font-size: 0.875rem; font-weight: 600;">{{ importStatus.progress?.message }}</span>
          <span style="font-size: 0.875rem; font-family: var(--font-mono); color: var(--accent-primary);">
            {{ importStatus.progress?.progress }}%
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: importStatus.progress?.progress + '%' }"></div>
        </div>
      </div>

      <div class="detail-row" style="margin-bottom: 24px;">
        <span class="detail-label">Скорость импорта (Размер чанка)</span>
        <div style="flex: 1;">
          <select class="select" v-model="chunkSize" style="width: 100%; margin-bottom: 8px;">
            <option :value="1000">1,000 (Медленно, 100% стабильность)</option>
            <option :value="5000">5,000 (Баланс, По умолчанию)</option>
            <option :value="25000">25,000 (Быстро, возможны микро-фризы)</option>
            <option :value="50000">50,000 (Очень быстро, требует ОЗУ)</option>
            <option :value="100000">100,000 (Агрессивно, макс. скорость)</option>
          </select>
          <p style="font-size: 0.75rem; color: var(--text-muted);">
            Увеличьте значение для ускорения импорта. Больший чанк сократит общее время, снизив накладные расходы на Event Loop.
          </p>
        </div>
      </div>

      <div class="toolbar" style="margin-bottom: 0;">
        <button
          class="btn btn-primary"
          @click="startImport"
          :disabled="importing || importStatus?.inProgress"
        >
          {{ importing ? 'Запуск...' : '🔄 Обновить библиотеку' }}
        </button>
        <button
          class="btn btn-secondary"
          @click="confirmClear"
          :disabled="importing || importStatus?.inProgress"
        >
          🗑️ Очистить базу
        </button>
      </div>
    </div>

    
    <div class="card fade-in" style="margin-top: 24px;">
      <h2 style="font-size: 1.125rem; margin-bottom: 16px;">📁 Настройки расположения</h2>
      
      <div class="detail-row" style="margin-bottom: 16px;">
        <span class="detail-label">Путь к библиотеке</span>
        <div style="flex: 1; display: flex; gap: 8px;">
          <input 
            type="text" 
            v-model="libraryPath" 
            class="input" 
            placeholder="/mnt/raid0/downloads/fb2.Flibusta.Net"
            style="font-family: var(--font-mono); font-size: 0.875rem;"
          />
          <button 
            class="btn btn-secondary" 
            @click="saveSettings"
            :disabled="savingSettings"
          >
            {{ savingSettings ? '...' : 'Сохранить' }}
          </button>
        </div>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 24px;">
        Укажите абсолютный путь к папке, в которой лежат .inpx файлы и ZIP-архивы библиотеки. Сохранение настроек применится мгновенно ко всем функциям (чтение, скачивание и парсинг).
      </p>

      <div class="detail-row">
        <span class="detail-label">База данных</span>
        <div class="detail-value" style="font-family: var(--font-mono); font-size: 0.875rem;">
          SQLite (data/library.db)
        </div>
      </div>
    </div>

    
    <div class="card fade-in" style="margin-top: 24px; text-align: center; padding: 40px;">
      <div style="font-size: 2rem; margin-bottom: 16px;">🌌</div>
      <h2 style="font-size: 1.25rem; margin-bottom: 8px;">VortexLib</h2>
      <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 24px;">
        Мгновенная локальная библиотека электронных книг.
      </p>
      
      <div style="border-top: 1px solid var(--border-color); padding-top: 24px; display: inline-block;">
        <p style="font-size: 0.8125rem; color: var(--text-secondary);">
          Created by <span style="color: var(--accent-secondary); font-weight: 700;">EinKRieGeR</span>
        </p>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
          © 2026 VortexLib. Все права защищены.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const importing = ref(false)
const importStatus = ref<any>(null)
let pollInterval: any = null

const chunkSizes = [1000, 5000, 25000, 50000, 100000]
const chunkIndex = ref(1)
const chunkSize = computed(() => chunkSizes[chunkIndex.value])

const libraryPath = ref('')
const savingSettings = ref(false)

const { data: statsData, refresh: refreshStats } = await useFetch('/api/stats', { server: false })
const { data: serverSettings } = await useFetch('/api/settings', { server: false })

if (serverSettings.value) {
  libraryPath.value = serverSettings.value.libraryPath || ''
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch('/api/settings', {
      method: 'POST',
      body: { libraryPath: libraryPath.value }
    })
    alert('Настройки сохранены!')
  } catch (e) {
    alert('Ошибка при сохранении')
  } finally {
    savingSettings.value = false
  }
}


const lastImportDate = computed(() => {
  if (!statsData.value?.importStatus?.imported_at) return null
  const date = new Date(statsData.value.importStatus.imported_at)
  return date.toLocaleString('ru')
})

async function startImport() {
  importing.value = true
  try {
    await $fetch('/api/import?chunkSize=' + chunkSize.value, { method: 'POST' })
    startPolling()
  } catch (e) {
    console.error('Import failed:', e)
  } finally {
    importing.value = false
  }
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
  if (confirm('Вы уверены, что хотите полностью очистить библиотеку? Это действие необратимо.')) {
    try {
      await $fetch('/api/import?action=clear', { method: 'POST' })
      alert('Библиотека успешно очищена')
      refreshStats()
    } catch (e) {
      alert('Ошибка при очистке библиотеки')
    }
  }
}
onMounted(async () => {
  const data: any = await $fetch('/api/import')
  importStatus.value = data
  if (data.inProgress) {
    startPolling()
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
