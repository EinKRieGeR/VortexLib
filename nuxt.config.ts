
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: true,
  devtools: { enabled: true },
  modules: ['@vueuse/nuxt', 'nuxt-auth-utils'],

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
        { name: 'description', content: 'VortexLib — персональная библиотека книг.' },
        { name: 'theme-color', content: '#0a0a1a' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      isDocker: process.env.DOCKERIZED === 'true'
    },
    libraryPath: process.env.NUXT_LIBRARY_PATH || '/mnt/raid0/downloads/fb2.Flibusta.Net',
    dbPath: process.env.NUXT_DB_PATH || '/home/einkrieger/Development/vortexlib/data/library.db',
    session: {
      name: 'vortex-session',
      password: process.env.NUXT_SESSION_PASSWORD || '',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      }
    }
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
    externals: {
      external: ['better-sqlite3'],
    }
  }
})
