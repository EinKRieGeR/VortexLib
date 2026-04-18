<template>
  <div class="page-container">
    <div class="flex-header">
      <div>
        <h1 class="section-title fade-in">Жанры</h1>
        <p class="section-subtitle fade-in">Выберите категорию для просмотра книг</p>
      </div>
      <div class="header-search-mini fade-in">
        <input 
          v-model="search" 
          type="text" 
          placeholder="Фильтр жанров..." 
          class="input mini"
        />
      </div>
    </div>

    <div v-if="pending" class="loading-container">
      <div class="spinner"></div>
      <p>Загрузка классификатора...</p>
    </div>

    <div v-else-if="filteredGroups.length" class="genres-alphabet fade-in">
      <div v-for="group in filteredGroups" :key="group.letter" class="alphabet-section">
        <h2 class="letter-title">{{ group.letter }}</h2>
        <div class="genre-tags-list">
          <NuxtLink
            v-for="genre in group.items"
            :key="genre.code"
            :to="{ path: '/', query: { genre: genre.code } }"
            class="genre-tag-mini"
          >
            {{ genre.name || genre.code }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">🏷️</div>
      <p>{{ search ? 'Ничего не найдено' : 'Жанры не найдены' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const search = ref('')
const { data: genresData, pending } = await useFetch('/api/genres', {
  lazy: true,
  server: false,
})

const filteredGroups = computed(() => {
  if (!genresData.value?.genres) return []
  
  const filtered = genresData.value.genres.filter(g => 
    (g.name || g.code).toLowerCase().includes(search.value.toLowerCase())
  )

  const groups: Record<string, any[]> = {}
  
  filtered.forEach(g => {
    const name = g.name || g.code
    const firstLetter = name.charAt(0).toUpperCase()
    if (!groups[firstLetter]) groups[firstLetter] = []
    groups[firstLetter].push(g)
  })

  return Object.keys(groups).sort().map(letter => ({
    letter,
    items: groups[letter].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code))
  }))
})
</script>

<style scoped>
.flex-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  gap: 20px;
}

.header-search-mini {
  width: 100%;
  max-width: 300px;
}

.alphabet-section {
  margin-bottom: 32px;
}

.letter-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent-primary);
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.genre-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.genre-tag-mini {
  padding: 6px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.genre-tag-mini:hover {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .flex-header { flex-direction: column; align-items: flex-start; }
  .header-search-mini { max-width: 100%; }
}
</style>
