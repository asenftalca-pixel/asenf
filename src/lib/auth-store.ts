
"use client"

import { useState, useEffect } from 'react'

export type UserRole = 'admin' | 'external'

export interface User {
  id: string
  name: string
  role: UserRole
}

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', role: 'admin' },
  { id: '2', name: 'Standard External', role: 'external' },
]

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('app_central_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = (role: UserRole) => {
    const selectedUser = MOCK_USERS.find(u => u.role === role) || MOCK_USERS[0]
    localStorage.setItem('app_central_user', JSON.stringify(selectedUser))
    setUser(selectedUser)
  }

  const logout = () => {
    localStorage.removeItem('app_central_user')
    setUser(null)
  }

  return { user, login, logout, isLoading }
}
