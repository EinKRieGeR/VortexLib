<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-inner">
        <NuxtLink to="/" class="logo">
          <div class="logo-icon">🌌</div>
          <span>VortexLib</span>
        </NuxtLink>

        <nav class="nav-links">
          <NuxtLink to="/">Каталог</NuxtLink>
          <NuxtLink to="/authors">Авторы</NuxtLink>
          <NuxtLink to="/genres">Жанры</NuxtLink>
          <NuxtLink to="/settings">Настройки</NuxtLink>
        </nav>

        <div class="header-search">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск книг, авторов, серий..."
            @keydown.enter="doSearch"
          />
        </div>

        <div class="header-stats" v-if="stats">
          <div class="stat-item" title="Всего книг">
            <span class="stat-icon">📚</span>
            <span class="stat-value">{{ formatNumber(stats.totalBooks) }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item" title="Всего авторов">
            <span class="stat-icon">👤</span>
            <span class="stat-value">{{ formatNumber(stats.totalAuthors) }}</span>
          </div>
          <div class="stat-divider" v-if="stats.totalGenres"></div>
          <div class="stat-item" v-if="stats.totalGenres" title="Всего жанров">
            <span class="stat-icon">🏷️</span>
            <span class="stat-value">{{ formatNumber(stats.totalGenres) }}</span>
          </div>
        </div>
      </div>
    </header>

    <main>
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
const searchQuery = ref('')
const router = useRouter()
const route = useRoute()

const { data: stats } = await useFetch('/api/stats', {
  lazy: true,
  server: false,
})
watch(() => route.query.q, (q) => {
  searchQuery.value = (q as string) || ''
}, { immediate: true })

function doSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/', query: { q: searchQuery.value.trim() } })
  } else {
    router.push('/')
  }
}

function formatNumber(n: number): string {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}
</script>
