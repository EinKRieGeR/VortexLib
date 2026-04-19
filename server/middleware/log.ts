export default defineEventHandler((event) => {
  const url = getRequestURL(event).pathname

  const ignoredPaths = [
    '/api/stats',
    '/api/settings',
    '/api/import',
    '/api/users',
    '/api/_auth/session',
    '/__nuxt_error'
  ]

  if (ignoredPaths.some(p => url.startsWith(p))) {
    return
  }

  console.log(`[REQUEST] ${getMethod(event)} ${url}`)
})
