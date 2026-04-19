export default defineNuxtRouteMiddleware((to, from) => {
  const { user } = useAuth()

  if (!user.value || user.value.role !== 'admin') {
    return navigateTo('/login')
  }
})
