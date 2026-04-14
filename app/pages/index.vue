<template>
  <div class="page-container">
    
    <div v-if="statsPending" class="loading-container" style="min-height: 50vh;">
      <div class="spinner"></div>
      <p>Проверка состояния библиотеки...</p>
    </div>

    
    <div v-else-if="needsImport && !searchQuery" class="import-section fade-in">
      <div class="card" style="padding: 48px; text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 24px;">🛸</div>
        <h2 style="font-size: 1.5rem; margin-bottom: 12px;">Библиотека пуста</h2>
        <p style="color: var(--text-secondary); margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto;">
          Кажется, вы еще не импортировали книги. Перейдите в настройки, чтобы запустить сканирование INPX-файла.
        </p>

        <NuxtLink to="/settings" class="btn btn-primary btn-lg">
          ⚙️ Перейти в настройки
        </NuxtLink>
      </div>
    </div>

    
    <template v-else>


      
      <div class="toolbar slide-down">
        <div class="toolbar-left">
          <h1 class="section-title" style="margin-bottom: 0; font-size: 1.25rem;">
            {{ searchQuery ? `Результаты: "${searchQuery}"` : 'Каталог книг' }}
          </h1>
          <span class="result-count" v-if="booksData?.total">
            <strong>{{ booksData.total.toLocaleString('ru') }}</strong> книг{{ pluralize(booksData.total) }}
          </span>
        </div>
        <div class="toolbar-right">
          <select class="select" v-model="selectedLang" @change="fetchBooks">
            <option value="">Все языки</option>
            <option v-for="l in langOptions" :key="l.lang" :value="l.lang">
              {{ langName(l.lang) }} ({{ l.count }})
            </option>
          </select>
          <select class="select" v-model="selectedSort" @change="fetchBooks">
            <option value="title">По названию</option>
            <option value="date">По дате</option>
            <option value="size">По размеру</option>
          </select>
          <select class="select" v-model="sortOrder" @change="fetchBooks">
            <option value="asc">↑ ASC</option>
            <option value="desc">↓ DESC</option>
          </select>
        </div>
      </div>

      
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Загрузка книг...</p>
      </div>

      <div v-else-if="booksData?.books?.length" class="book-grid">
        <div
          v-for="book in booksData.books"
          :key="book.id"
          class="book-card fade-in"
          @click="navigateToBook(book.id)"
        >
          <div class="book-cover">
            <img :src="`/api/books/${book.id}/cover`" loading="lazy" @error="(e: any) => e.target.style.display = 'none'" />
            <div class="cover-placeholder">📖</div>
          </div>
          <div class="book-info">
            <div class="book-title">{{ book.title }}</div>
            <div class="book-authors" v-if="book.authors?.length">
              {{ book.authors.map((a: any) => a.name).join(', ') }}
            </div>
            <div class="book-series" v-if="book.series">
              📖 {{ book.series }}
              <span v-if="book.series_num"> #{{ book.series_num }}</span>
            </div>
            <div class="book-meta">
              <span class="badge badge-format">{{ book.format?.toUpperCase() }}</span>
              <span class="badge badge-lang">{{ book.lang }}</span>
              <span class="badge badge-size">{{ formatSize(book.file_size) }}</span>
            </div>
            <div class="book-genres" v-if="book.genres?.length">
              <span v-for="genre in (book.genres || []).slice(0, 2)" :key="genre.code" class="badge badge-genre">
                {{ genre.name || genre.code }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📭</div>
        <p>{{ searchQuery ? 'Книги не найдены. Попробуйте другой запрос.' : 'Библиотека пуста. Запустите импорт.' }}</p>
      </div>

      
      <div v-if="booksData?.books?.length && hasMore" ref="loadMoreTarget" class="infinite-scroll-trigger">
        <div class="spinner small"></div>
        <span>Подгружаем еще...</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const searchQuery = computed(() => (route.query.q as string) || '')
const selectedGenre = ref((route.query.genre as string) || '')
const selectedAuthor = ref((route.query.author as string) || '')
const selectedLang = ref((route.query.lang as string) || '')
const selectedSort = ref((route.query.sort as string) || 'title')
const sortOrder = ref((route.query.order as string) || 'asc')
const currentPage = ref(parseInt(route.query.page as string) || 1)
const loading = ref(false)
const importing = ref(false)
const { data: statsData, pending: statsPending } = await useFetch('/api/stats', { lazy: true, server: false })
const langOptions = computed(() => (statsData.value as any)?.langStats || [])
const topLang = computed(() => {
  const top = langOptions.value[0]
  return top ? langName(top.lang) : '—'
})
const needsImport = computed(() => {
  if (statsPending.value) return false
  return !statsData.value || (statsData.value as any)?.totalBooks === 0
})
const importStatus = ref<any>(null)
let importPollTimer: any = null

const booksData = ref<any>(null)
const loadMoreTarget = ref(null)

const hasMore = computed(() => {
  if (!booksData.value) return false
  return currentPage.value < (booksData.value.totalPages || 1)
})

async function fetchBooks(append = false) {
  if (!append) loading.value = true
  try {
    const params: Record<string, string> = {
      page: currentPage.value.toString(),
      perPage: '30',
      sort: selectedSort.value,
      order: sortOrder.value,
    }
    if (searchQuery.value) params.q = searchQuery.value
    if (selectedLang.value) params.lang = selectedLang.value
    if (selectedGenre.value) params.genre = selectedGenre.value
    if (selectedAuthor.value) params.author = selectedAuthor.value

    const data: any = await $fetch('/api/books', { params })

    if (append && booksData.value) {
      booksData.value.books.push(...data.books)
      booksData.value.totalPages = data.totalPages
    } else {
      booksData.value = data
    }
  } catch (e) {
    console.error('Failed to fetch books:', e)
  } finally {
    loading.value = false
  }
}
useIntersectionObserver(
  loadMoreTarget,
  ([{ isIntersecting }]) => {
    if (isIntersecting && hasMore.value && !loading.value) {
      currentPage.value++
      fetchBooks(true)
    }
  },
  { threshold: 0.5 }
)
watch([searchQuery, selectedGenre, selectedAuthor, selectedLang, selectedSort, sortOrder], () => {
  currentPage.value = 1
  fetchBooks(false)
}, { immediate: true })

async function startImport() {
  importing.value = true
  try {
    await $fetch('/api/import', { method: 'POST' })
    importPollTimer = setInterval(async () => {
      const status = await $fetch('/api/import')
      importStatus.value = status
      if (!(status as any).inProgress) {
        clearInterval(importPollTimer)
        importing.value = false
        const newStats = await $fetch('/api/stats')
        statsData.value = newStats as any
        fetchBooks()
      }
    }, 2000)
  } catch (e) {
    console.error('Import error:', e)
    importing.value = false
  }
}

function navigateToBook(id: number) {
  router.push(`/book/${id}`)
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

function formatNumber(n: number): string {
  if (!n) return '0'
  return n.toLocaleString('ru')
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
    it: 'Italiano',
    pl: 'Polski',
    cs: 'Čeština',
    bg: 'Български',
    sr: 'Српски',
    hr: 'Hrvatski',
    ja: '日本語',
    zh: '中文',
  }
  return map[code] || code
}

function pluralize(n: number): string {
  const lastTwo = n % 100
  const last = n % 10
  if (lastTwo >= 11 && lastTwo <= 19) return ''
  if (last === 1) return 'а'
  if (last >= 2 && last <= 4) return 'и'
  return ''
}

onUnmounted(() => {
  if (importPollTimer) clearInterval(importPollTimer)
})
</script>
