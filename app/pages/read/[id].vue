<template>
  <div class="reader-mode" :class="`theme-${theme}`" :style="{ fontSize: `${fontSize}px` }">
    <div v-if="pending" class="reader-loading">
      <div class="spinner"></div>
      <p>Распаковка и подготовка книги...</p>
    </div>

    <div v-else-if="error" class="reader-error">
      <div style="font-size: 3rem; margin-bottom: 16px;">😕</div>
      <p>Не удалось открыть книгу.</p>
      <NuxtLink :to="`/book/${bookId}`" class="btn btn-secondary mt-4">Вернуться к книге</NuxtLink>
    </div>

    <template v-else-if="bookData">
      
      <header class="reader-header slide-down" :class="{ 'header-hidden': !showHeader }">
        <NuxtLink :to="`/book/${bookId}`" class="back-button">
          ← Назад
        </NuxtLink>
        
        <div class="reader-title">{{ bookData.title }}</div>
        
        <button class="settings-button" @click="showSettings = !showSettings">
          Настройки ⚙️
        </button>

        
        <div v-if="showSettings" class="settings-dropdown">
          <div class="settings-group">
            <label>Тема</label>
            <div class="theme-options">
              <button class="theme-btn light" :class="{ active: theme === 'light' }" @click="setTheme('light')">A</button>
              <button class="theme-btn sepia" :class="{ active: theme === 'sepia' }" @click="setTheme('sepia')">A</button>
              <button class="theme-btn dark" :class="{ active: theme === 'dark' }" @click="setTheme('dark')">A</button>
            </div>
          </div>
          
          <div class="settings-group">
            <label>Размер шрифта</label>
            <div class="font-options">
              <button @click="changeFont(-2)">A-</button>
              <span>{{ fontSize }}px</span>
              <button @click="changeFont(2)">A+</button>
            </div>
          </div>
        </div>
      </header>

      
      <div class="reader-content-wrap" @click="toggleHeader">
        <div class="reader-content fade-in" v-html="bookData.html"></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core'

definePageMeta({ layout: false })

const route = useRoute()
const bookId = computed(() => route.params.id as string)

const keyTheme = 'vortex-reader-theme'
const keyFont = 'vortex-reader-font'
const keyScroll = `vortex-scroll-${bookId.value}`
const theme = ref('dark')
const fontSize = ref(18)
const showHeader = ref(true)
const showSettings = ref(false)

if (import.meta.client) {
  theme.value = localStorage.getItem(keyTheme) || 'dark'
  const savedFont = parseInt(localStorage.getItem(keyFont) || '18')
  if (!isNaN(savedFont)) fontSize.value = savedFont
}

const { data: bookData, pending, error } = await useFetch(`/api/books/${bookId.value}/read`, {
  lazy: true,
  server: false
})

const { y } = useWindowScroll()

let scrollDebounce: any = null
watch(y, (newY, oldY) => {
  if (!import.meta.client) return
  if (newY < 50) {
    showHeader.value = true
  } else if (oldY !== undefined) {
    if (newY > oldY + 10) {
      showHeader.value = false
      showSettings.value = false
    } else if (newY < oldY - 10) {
      showHeader.value = true
    }
  }
  
  clearTimeout(scrollDebounce)
  scrollDebounce = setTimeout(() => {
    localStorage.setItem(keyScroll, newY.toString())
  }, 500)
})

watch(bookData, (data) => {
  if (data && import.meta.client) {
    setTimeout(() => {
      const savedScroll = parseInt(localStorage.getItem(keyScroll) || '0')
      if (savedScroll > 10) {
        window.scrollTo({ top: savedScroll, behavior: 'instant' })
        showHeader.value = true
      }
    }, 100)
  }
})

function setTheme(t: string) {
  theme.value = t
  localStorage.setItem(keyTheme, t)
}

function changeFont(delta: number) {
  fontSize.value = Math.max(12, Math.min(32, fontSize.value + delta))
  localStorage.setItem(keyFont, fontSize.value.toString())
}

function toggleHeader(e: Event) {
  const target = e.target as HTMLElement
  if (target.tagName.toLowerCase() === 'a' || target.closest('a')) return
  
  showHeader.value = !showHeader.value
  showSettings.value = false
}
</script>

<style>

.reader-mode {
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
  font-family: 'Inter', Georgia, serif;
}


.theme-light {
  --r-bg: #f9f9fb;
  --r-text: #222228;
  --r-header: #ffffff;
  --r-border: #e0e0e0;
  --r-accent: #6c5ce7;
}

.theme-sepia {
  --r-bg: #f4ecd8;
  --r-text: #433422;
  --r-header: #eedebe;
  --r-border: #d4c4a8;
  --r-accent: #a0522d;
}

.theme-dark {
  --r-bg: #0c0c20;
  --r-text: #e8e8f4;
  --r-header: #141432;
  --r-border: rgba(108, 92, 231, 0.2);
  --r-accent: #6c5ce7;
}

.reader-mode {
  background-color: var(--r-bg);
  color: var(--r-text);
}

.reader-loading, .reader-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  color: var(--r-text);
  opacity: 0.7;
}


.reader-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--r-header);
  border-bottom: 1px solid var(--r-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.header-hidden {
  transform: translateY(-100%);
}

.reader-title {
  font-weight: 600;
  flex: 1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 20px;
  font-size: 1rem;
}

.back-button, .settings-button {
  background: transparent;
  color: var(--r-text);
  border: none;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  text-decoration: none;
}
.back-button:hover, .settings-button:hover {
  background: rgba(128, 128, 128, 0.1);
}


.settings-dropdown {
  position: absolute;
  top: 70px;
  right: 20px;
  background: var(--r-header);
  border: 1px solid var(--r-border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 200px;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.settings-group label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

.theme-options {
  display: flex;
  gap: 8px;
}
.theme-btn {
  flex: 1;
  height: 40px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  font-weight: bold;
}
.theme-btn.light { background: #f9f9fb; color: #222228; border-color: #e0e0e0; }
.theme-btn.sepia { background: #f4ecd8; color: #433422; border-color: #d4c4a8; }
.theme-btn.dark { background: #0c0c20; color: #e8e8f4; border-color: rgba(255,255,255,0.1); }
.theme-btn.active { border-color: var(--r-accent); }

.font-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(128, 128, 128, 0.1);
  border-radius: 8px;
  padding: 4px;
}
.font-options button {
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  cursor: pointer;
  color: var(--r-text);
  border-radius: 6px;
}
.font-options button:hover { background: rgba(128, 128, 128, 0.15); }
.font-options span { font-size: 0.875rem; font-family: monospace; }


.reader-content-wrap {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  cursor: pointer;
}

.reader-content {
  max-width: 760px;
  width: 100%;
  padding: 100px 24px;
  line-height: 1.65;
}


.reader-content p {
  margin-bottom: 1.25em;
  text-align: justify;
  text-indent: 2em;
}

.reader-content h2.chapter-title {
  font-size: 1.75em;
  font-weight: 700;
  text-align: center;
  margin: 3em 0 1.5em;
  line-height: 1.3;
}

.reader-content h3 {
  font-size: 1.35em;
  font-weight: 600;
  text-align: center;
  margin: 2em 0 1em;
}

.reader-content img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 2em auto;
  border-radius: 4px;
}

.reader-content .epigraph {
  margin: 2em 0 2em 15%;
  font-style: italic;
  opacity: 0.9;
  border-left: 3px solid var(--r-accent);
  padding-left: 1em;
}

.reader-content .text-author {
  text-align: right;
  font-weight: 600;
  margin-top: -1em;
  font-style: italic;
}

.reader-content .poem, .reader-content .stanza {
  margin: 1.5em 0 1.5em 15%;
  font-style: italic;
}
.reader-content .verse {
  margin-bottom: 0.5em;
  text-indent: 0;
}

.reader-content a {
  color: var(--r-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
