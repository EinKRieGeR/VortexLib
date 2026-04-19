<template>
  <div class="page-container">
    
    <!-- We wrap the whole conditional content area in ClientOnly to avoid hydration mismatches 
         since the library state (empty, loading, or with books) can change drastically 
         between server and client. -->
    <ClientOnly>
      <!-- 1. LOADING STATE -->
      <div v-if="statsPending" class="loading-container" style="min-height: 60vh;">
        <div class="spinner-container">
          <div class="spinner"></div>
          <div class="spinner-core">🌌</div>
        </div>
        <div class="loading-details fade-in">
          <h2 class="loading-title">Инициализация VortexLib</h2>
          <div class="loading-steps">
            <div class="step" :class="{ active: statsPending }">
              <span class="step-icon">🔌</span>
              <span class="step-text">Подключение к SQLite...</span>
              <span class="step-status">OK</span>
            </div>
            <div class="step" :class="{ active: statsPending }">
              <span class="step-icon">📖</span>
              <span class="step-text">Актуализация каталога...</span>
              <span class="step-status pulse">RUNNING</span>
            </div>
            <div class="step">
              <span class="step-icon">👤</span>
              <span class="step-text">Синхронизация авторов и серий...</span>
              <span class="step-status">WAIT</span>
            </div>
          </div>
          <p class="loading-hint">Это займет всего пару мгновений</p>
        </div>
      </div>

      <!-- 2. EMPTY STATE / NEEDS IMPORT -->
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

      <!-- 3. MAIN CATALOG / SEARCH RESULTS -->
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

        <div v-if="loading" class="loading-container" style="min-height: 40vh;">
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
              <img :src="`/api/books/${book.id}/cover`" loading="lazy" @error="(e: any) => e.target.style.opacity = '0'" />
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

      <!-- Placeholder content for the server during hydration to minimize shift -->
      <template #fallback>
        <div class="loading-container" style="min-height: 60vh;">
          <div class="spinner"></div>
          <p>Загрузка VortexLib...</p>
        </div>
      </template>
    </ClientOnly>
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

// Fetch site stats (client-side only for now to keep SSR happy)
const { data: statsData, pending: statsPending } = await useFetch('/api/stats', { 
  lazy: true, 
  server: false 
})

const langOptions = computed(() => (statsData.value as any)?.langStats || [])
const needsImport = computed(() => {
  if (statsPending.value) return false
  return !statsData.value || (statsData.value as any)?.totalBooks === 0
})

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

function langName(code: string): string {
  const map: Record<string, string> = {
    ru: 'Русский', en: 'English', uk: 'Українська', be: 'Беларуская',
    de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano',
    pl: 'Polski', cs: 'Čeština', bg: 'Български', sr: 'Српски',
    hr: 'Hrvatski', ja: '日本語', zh: '中文',
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
</script>

<style scoped>
.spinner-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.spinner-core {
  position: absolute;
  font-size: 1.5rem;
  animation: pulse-core 2s infinite ease-in-out;
}

@keyframes pulse-core {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
}

.loading-details {
  text-align: center;
  max-width: 400px;
}

.loading-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 24px;
  background: linear-gradient(90deg, var(--text-primary), var(--accent-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.loading-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
  color: var(--text-muted);
  opacity: 0.6;
  transition: all 0.3s;
}

.step.active {
  opacity: 1;
  color: var(--text-primary);
}

.step-icon { font-size: 1.125rem; }
.step-text { flex: 1; text-align: left; }

.step-status {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.step-status.pulse {
  color: var(--accent-primary);
  animation: blink 1s infinite;
}

@keyframes blink {
  50% { opacity: 0.3; }
}

.loading-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}
</style>
