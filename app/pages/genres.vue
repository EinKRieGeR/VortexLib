<template>
  <div class="page-container">
    <h1 class="section-title fade-in">Жанры</h1>
    <p class="section-subtitle fade-in">Выберите жанр для просмотра книг</p>

    <div v-if="pending" class="loading-container">
      <div class="spinner"></div>
      <p>Загрузка жанров...</p>
    </div>

    <div v-else-if="genresData?.genres?.length" class="genre-cloud fade-in">
      <NuxtLink
        v-for="genre in genresData.genres"
        :key="genre.code"
        :to="{ path: '/', query: { genre: genre.code } }"
        class="genre-tag"
      >
        {{ genre.name }}
        <span class="genre-count">{{ genre.bookCount.toLocaleString('ru') }}</span>
      </NuxtLink>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">🏷️</div>
      <p>Жанры не найдены. Импортируйте библиотеку.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: genresData, pending } = await useFetch('/api/genres', {
  lazy: true,
  server: false,
})
</script>
