<template>
  <div class="page-container">
    <h1 class="section-title fade-in">Авторы</h1>

    
    <div class="toolbar slide-down">
      <div class="toolbar-left">
        <div class="header-search" style="max-width: 400px;">
          <span class="search-icon">🔍</span>
          <input
            v-model="authorSearch"
            type="text"
            placeholder="Поиск авторов..."
            @input="debouncedFetch"
          />
        </div>
        <span class="result-count" v-if="authorsData?.total">
          <strong>{{ authorsData.total.toLocaleString('ru') }}</strong> авторов
        </span>
      </div>
    </div>

    
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Загрузка...</p>
    </div>

    
    <div v-else-if="authorsData?.authors?.length" class="author-grid">
      <NuxtLink
        v-for="author in authorsData.authors"
        :key="author.id"
        :to="{ path: '/', query: { author: author.id } }"
        class="author-card-new fade-in"
      >
        <div class="author-avatar">👤</div>
        <div class="author-info">
          <span class="author-name">{{ author.name }}</span>
          <span class="author-meta">Автор в библиотеке</span>
        </div>
        <div class="author-badge" title="Количество книг">
          {{ author.bookCount }}
        </div>
      </NuxtLink>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">👤</div>
      <p>Авторы не найдены</p>
    </div>

    
    <div v-if="authorsData?.authors?.length && hasMore" ref="loadMoreTarget" class="infinite-scroll-trigger">
      <div class="spinner small"></div>
      <span>Подгружаем авторов...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const authorSearch = ref('')
const currentPage = ref(1)
const authorsData = ref<any>(null)
const loading = ref(false)
const appending = ref(false)
const loadMoreTarget = ref(null)

let debounceTimer: any = null

function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchAuthors(false)
  }, 300)
}

const hasMore = computed(() => {
  if (!authorsData.value) return false
  return currentPage.value < (authorsData.value.totalPages || 1)
})

async function fetchAuthors(append = false) {
  if (append) appending.value = true
  else loading.value = true

  try {
    const params: Record<string, string> = {
      page: currentPage.value.toString(),
      perPage: '60',
    }
    if (authorSearch.value.trim()) params.q = authorSearch.value.trim()

    const data: any = await $fetch('/api/authors', { params })
    
    if (append && authorsData.value) {
      authorsData.value.authors.push(...data.authors)
      authorsData.value.totalPages = data.totalPages
    } else {
      authorsData.value = data
    }
  } catch (e) {
    console.error('Fetch authors error:', e)
  } finally {
    loading.value = false
    appending.value = false
  }
}
useIntersectionObserver(
  loadMoreTarget,
  ([{ isIntersecting }]) => {
    if (isIntersecting && hasMore.value && !loading.value && !appending.value) {
      currentPage.value++
      fetchAuthors(true)
    }
  },
  { threshold: 0.1 }
)
onMounted(() => {
  fetchAuthors()
})
</script>
