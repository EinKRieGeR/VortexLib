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
          <NuxtLink v-if="user?.role === 'admin'" to="/settings">Настройки</NuxtLink>
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
        
        <div class="header-auth" style="display: flex; align-items: center; gap: 16px; margin-left: 20px;">
          <template v-if="isLoaded">
            <template v-if="user">
              <div class="user-badge" style="display: flex; align-items: center; gap: 8px;">
                <span class="user-role" :class="user.role">{{ user.role === 'admin' ? '👑' : (user.role === 'moderator' ? '🛡️' : '👤') }}</span>
                <span style="font-weight: 600; font-size: 0.875rem;">{{ user.username }}</span>
              </div>
              <button @click="doLogout" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;">Выход</button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="btn btn-primary" style="padding: 6px 16px; font-size: 0.875rem;">Войти</NuxtLink>
            </template>
          </template>
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

const { user, isLoaded, logout } = useAuth()

async function doLogout() {
  await logout()
  router.push('/login')
}

const { data: stats, refresh: refreshStats } = useFetch('/api/stats', {
  lazy: true,
  server: false,
})

// Auto-refresh stats every 5s while import is running
let statsInterval: ReturnType<typeof setInterval> | null = null
watch(() => stats.value?.importStatus?.status, (status) => {
  if (status === 'running' || status === 'pending') {
    if (!statsInterval) {
      statsInterval = setInterval(() => refreshStats(), 5000)
    }
  } else {
    if (statsInterval) {
      clearInterval(statsInterval)
      statsInterval = null
    }
  }
})
onUnmounted(() => { if (statsInterval) clearInterval(statsInterval) })

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
