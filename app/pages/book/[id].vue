<template>
  <div class="page-container">
    <div v-if="pending" class="loading-container">
      <div class="spinner"></div>
      <p>Загрузка информации о книге...</p>
    </div>

    <div v-else-if="error" class="empty-state">
      <div class="empty-icon">😕</div>
      <p>Книга не найдена</p>
      <NuxtLink to="/" class="btn btn-secondary mt-4">← Вернуться в каталог</NuxtLink>
    </div>

    <template v-else-if="book">
      
      <div style="margin-bottom: 24px;" class="fade-in">
        <NuxtLink to="/" class="btn btn-ghost btn-sm">← Каталог</NuxtLink>
      </div>

      <div class="book-detail fade-in">
        
        <div class="book-detail-sidebar">
          <div class="card" style="text-align: center; padding: 32px;">
            <div class="detail-cover">
              <img :src="`/api/books/${book.id}/cover`" @error="(e: any) => e.target.style.display = 'none'" />
              <div class="detail-cover-placeholder">📖</div>
            </div>
            <div class="badge badge-format" style="font-size: 1rem; padding: 8px 20px; margin-bottom: 16px;">
              {{ book.format?.toUpperCase() }}
            </div>
            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 20px;">
              {{ formatSize(book.file_size) }}
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
              <NuxtLink
                v-if="book.format?.toLowerCase() === 'fb2'"
                :to="`/read/${book.id}`"
                class="btn btn-primary btn-lg"
              >
                📖 Читать онлайн
              </NuxtLink>
              
              <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-align: left; margin-bottom: 2px;">Скачать в формате:</div>
                <a
                  :href="`/api/books/${book.id}/download?format=${book.format}`"
                  class="btn btn-secondary btn-sm"
                  style="justify-content: flex-start; margin-bottom: 4px;"
                  target="_blank"
                  download
                  rel="noopener noreferrer"
                  @click.stop
                >
                  ⬇ Оригинал ({{ book.format?.toUpperCase() }})
                </a>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <button
                    class="btn btn-secondary btn-sm"
                    @click="downloadFormat('epub')"
                    :disabled="converting === 'epub'"
                  >
                    {{ converting === 'epub' ? '⏳...' : 'EPUB' }}
                  </button>
                  <button
                    class="btn btn-secondary btn-sm"
                    @click="downloadFormat('mobi')"
                    :disabled="converting === 'mobi'"
                  >
                    {{ converting === 'mobi' ? '⏳...' : 'MOBI' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          
          <div v-if="book.seriesBooks?.length > 1" class="card">
            <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary);">
              📖 Серия: {{ book.series }}
            </h3>
            <div class="series-list">
              <NuxtLink
                v-for="sb in book.seriesBooks"
                :key="sb.id"
                :to="`/book/${sb.id}`"
                class="series-item"
                :class="{ active: sb.id === book.id }"
              >
                <span class="series-num">{{ sb.series_num || '–' }}</span>
                <span class="series-title">{{ sb.title }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        
        <div class="book-detail-info">
          <h1>{{ book.title }}</h1>

          <div class="detail-row" v-if="book.authors?.length">
            <span class="detail-label">Авторы</span>
            <div class="detail-value">
              <NuxtLink
                v-for="(author, idx) in book.authors"
                :key="author.id"
                :to="{ path: '/', query: { author: author.id } }"
                style="color: var(--accent-secondary);"
              >
                {{ author.name }}{{ idx < book.authors.length - 1 ? ', ' : '' }}
              </NuxtLink>
            </div>
          </div>

          <div class="detail-row" v-if="book.series">
            <span class="detail-label">Серия</span>
            <div class="detail-value">
              {{ book.series }}
              <span v-if="book.series_num" style="color: var(--text-muted);"> #{{ book.series_num }}</span>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">Жанры</span>
            <div class="detail-value" style="display: flex; flex-wrap: wrap; gap: 6px;">
              <NuxtLink
                v-for="genre in book.genres"
                :key="genre.code"
                :to="{ path: '/', query: { genre: genre.code } }"
                class="badge badge-genre"
                style="cursor: pointer; text-decoration: none;"
              >
                {{ genre.name }}
              </NuxtLink>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">Язык</span>
            <div class="detail-value">
              <span class="badge badge-lang">{{ langName(book.lang) }}</span>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">Формат</span>
            <div class="detail-value">
              <span class="badge badge-format">{{ book.format?.toUpperCase() }}</span>
              <span style="margin-left: 8px; color: var(--text-muted);">{{ formatSize(book.file_size) }}</span>
            </div>
          </div>

          <div class="detail-row" v-if="book.date_added">
            <span class="detail-label">Добавлено</span>
            <div class="detail-value">{{ book.date_added }}</div>
          </div>

          <div class="detail-row">
            <span class="detail-label">ID</span>
            <div class="detail-value" style="font-family: var(--font-mono); color: var(--text-muted);">
              {{ book.id }}
            </div>
          </div>

          <div class="detail-row" v-if="book.archive_name">
            <span class="detail-label">Архив</span>
            <div class="detail-value" style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-muted);">
              {{ book.archive_name }}
            </div>
          </div>

          
          <div v-if="book.otherBooks?.length" style="margin-top: 32px;">
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px;">
              Другие книги автора
            </h3>
            <div class="book-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));">
              <NuxtLink
                v-for="ob in book.otherBooks.slice(0, 8)"
                :key="ob.id"
                :to="`/book/${ob.id}`"
                class="book-card"
                style="text-decoration: none;"
              >
                <div class="book-cover" style="width: 60px; height: 85px;">
                  <img :src="`/api/books/${ob.id}/cover`" loading="lazy" @error="(e: any) => e.target.style.display = 'none'" />
                  <div class="cover-placeholder" style="font-size: 1rem;">📖</div>
                </div>
                <div class="book-info">
                  <div class="book-title">{{ ob.title }}</div>
                  <div class="book-series" v-if="ob.series">{{ ob.series }}</div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const bookId = computed(() => route.params.id as string)
const converting = ref<string | null>(null)

const { data: book, pending, error } = await useFetch(`/api/books/${bookId.value}`, {
  key: `book-${bookId.value}`,
})

async function downloadFormat(fmt: string) {
  converting.value = fmt
  try {
    const res = await fetch(`/api/books/${bookId.value}/download?format=${fmt}`)
    
    if (!res.ok) {
      alert('Ошибка при конвертации книги. Задание в очереди или Calibre не установлен.')
      return
    }
    let filename = `book.${fmt}`
    const contentDisposition = res.headers.get('Content-Disposition')
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*=UTF-8''(.+)/i)
      if (match && match[1]) {
        filename = decodeURIComponent(match[1])
      }
    }

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    
    setTimeout(() => {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 100)

  } catch (e: any) {
    alert('Не удалось скачать файл: ' + e.message)
  } finally {
    converting.value = null
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function langName(code: string): string {
  const map: Record<string, string> = {
    ru: 'Русский',
    en: 'English',
    uk: 'Українська',
    be: 'Беларуская',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
  }
  return map[code] || code
}
</script>
