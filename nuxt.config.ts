
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@vueuse/nuxt'],

  devServer: {
    port: 4224,
    host: '0.0.0.0',
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit'
      ]
    }
  },

  app: {
    head: {
      title: 'VortexLib — Библиотека',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'VortexLib — персональная библиотека книг. Поиск, каталогизация и скачивание.' },
        { name: 'theme-color', content: '#0a0a1a' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    libraryPath: '/mnt/raid0/downloads/fb2.Flibusta.Net',
    dbPath: '/home/einkrieger/Development/vortexlib/data/library.db',
  },

  nitro: {
    experimental: {
      asyncContext: true,
      tasks: true
    },
    tasks: {
      'library:import': {
        handler: './server/tasks/import.ts'
      }
    },
    // Do not bundle native modules — they must be loaded from node_modules at runtime
    externals: {
      external: ['better-sqlite3'],
    }
  },

  routeRules: {
  }
})
