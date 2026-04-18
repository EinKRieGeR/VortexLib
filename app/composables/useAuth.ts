export const useAuth = () => {
  const user = useState<any>('auth-user', () => null)
  const isLoaded = useState<boolean>('auth-loaded', () => false)

  async function fetchUser() {
    try {
      const data: any = await $fetch('/api/auth/me')
      user.value = data.user
    } catch {
      user.value = null
    } finally {
      isLoaded.value = true
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, isLoaded, fetchUser, logout }
}
