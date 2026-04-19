export const useAuth = () => {
  const { user, session, fetch: fetchSession, clear } = useUserSession()

  const isLoaded = computed(() => user.value !== undefined)

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
  }

  return {
    user,
    isLoaded,
    fetchUser: fetchSession,
    logout,
  }
}
