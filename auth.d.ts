declare module '#auth-utils' {
  interface User {
    id: number;
    username: string;
    role: 'admin' | 'user';
  }

  interface UserSession {
    // For additional properties
  }
}

export { }
