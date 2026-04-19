<template>
  <div class="auth-page">
    <div class="auth-card fade-in">
      <h2>{{ isRegister ? 'Регистрация' : 'Вход в библиотеку' }}</h2>
      
      <form @submit.prevent="submit">
        <div class="input-group">
          <label>Логин</label>
          <input type="text" v-model="username" class="input" required minlength="3" />
        </div>
        
        <div class="input-group">
          <label>Пароль</label>
          <input type="password" v-model="password" class="input" required minlength="4" />
        </div>

        <div v-if="error" class="auth-error">{{ error }}</div>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 16px;" :disabled="loading">
          {{ loading ? '...' : (isRegister ? 'Зарегистрироваться' : 'Войти') }}
        </button>
      </form>
      
      <p class="auth-switch">
        {{ isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?' }}
        <a href="#" @click.prevent="isRegister = !isRegister; error = ''">
          {{ isRegister ? 'Войти' : 'Регистрация' }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const isRegister = ref(false)
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const { user, fetchUser } = useAuth()
const router = useRouter()

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const endpoint = isRegister.value ? '/api/auth/register' : '/api/auth/login'
    
    await $fetch(endpoint, {
      method: 'POST',
      body: { username: username.value, password: password.value }
    })
    
    await fetchUser()
    
    if (user.value) {
      router.push('/')
    } else {
      error.value = 'Ошибка синхронизации сессии'
    }
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.data?.message || err.message || 'Произошла ошибка'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
}
.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 32px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
.auth-card h2 {
  text-align: center;
  margin-bottom: 24px;
}
.input-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.auth-error {
  color: #ff6b6b;
  font-size: 0.875rem;
  margin-top: 8px;
  text-align: center;
}
.auth-switch {
  margin-top: 24px;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}
.auth-switch a {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
}
</style>
