import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface DashboardStats {
  chats: {
    total: number
    unread: number
    active: number
    archived: number
  }
  messages: {
    pending: number
    queued: number
    sent: number
    failed: number
  }
  whatsapp: {
    connected: boolean
    state: string
    hasQR: boolean
  }
}

export interface Message {
  id: string
  userId: string
  phoneNumber: string
  message: string
  templateId?: string
  status: 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED'
  sentAt?: string
  errorMessage?: string
  retryCount: number
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  content: string
  variables: string[]
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Chat {
  id: string
  phoneNumber: string
  message: string
  messageType: string
  isRead: boolean
  isTriggered: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiToken {
  id: string
  name: string
  tokenPrefix: string
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
}

export interface WhatsAppStatus {
  connected: boolean
  state: string
  hasQR: boolean
}

export interface QRCodeResponse {
  qrCode: string
  expiresIn: number
}

export interface Admin {
  id: string
  username: string
  email?: string
  role: 'SUPER_ADMIN' | 'ADMIN'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post('/admin/login', { username, password })
    return response.data
  },
}

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/admin/dashboard')
    return response.data.data
  },
}

// Messages API
// Note: There's no direct endpoint to get all messages in wa-service
// You may need to create an admin endpoint or query directly from database
// For now, this is a placeholder that would work if such endpoint exists
export const messagesApi = {
  getAll: async (params?: { status?: string; page?: number; limit?: number }): Promise<Message[]> => {
    // This endpoint might not exist - you may need to create /api/admin/messages
    try {
      const response = await api.get('/admin/messages', { params })
      return response.data.data?.messages || response.data.data || []
    } catch (error) {
      // Fallback: return empty array if endpoint doesn't exist
      console.warn('Messages endpoint not available, returning empty array')
      return []
    }
  },
  getById: async (id: string): Promise<Message> => {
    const response = await api.get(`/messages/status/${id}`)
    return response.data.data
  },
}

// Templates API
export const templatesApi = {
  getAll: async (): Promise<Template[]> => {
    const response = await api.get('/templates')
    return response.data.data || []
  },
  getById: async (id: string): Promise<Template> => {
    const response = await api.get(`/templates/${id}`)
    return response.data.data
  },
  create: async (data: { name: string; content: string; variables: string[]; description?: string }) => {
    const response = await api.post('/templates', data)
    return response.data
  },
  update: async (id: string, data: Partial<Template>) => {
    const response = await api.put(`/templates/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/templates/${id}`)
    return response.data
  },
}

// Chats API
export const chatsApi = {
  getAll: async (params?: { isRead?: boolean; page?: number; limit?: number }): Promise<Chat[]> => {
    const response = await api.get('/admin/chats', { 
      params: {
        ...params,
        isRead: params?.isRead !== undefined ? String(params.isRead) : undefined,
      }
    })
    // Handle paginated response
    return response.data.data?.chats || response.data.data || []
  },
  getById: async (id: string): Promise<Chat> => {
    const response = await api.get(`/admin/chats/${id}`)
    return response.data.data
  },
  reply: async (id: string, message: string) => {
    const response = await api.post(`/admin/chats/${id}/reply`, { message })
    return response.data
  },
}

// API Tokens API
export const apiTokensApi = {
  getAll: async (): Promise<ApiToken[]> => {
    const response = await api.get('/admin/api-tokens')
    return response.data.data || []
  },
  create: async (data: { name: string; expiresAt?: string }) => {
    const response = await api.post('/admin/api-tokens', data)
    return response.data
  },
  revoke: async (id: string) => {
    const response = await api.post(`/admin/api-tokens/${id}/revoke`)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/admin/api-tokens/${id}`)
    return response.data
  },
}

// WhatsApp API
export const whatsappApi = {
  getStatus: async (): Promise<WhatsAppStatus> => {
    const response = await api.get('/whatsapp/status')
    return response.data.data
  },
  getQR: async (): Promise<QRCodeResponse> => {
    const response = await api.get('/whatsapp/qr', {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
      },
    })
    return response.data.data
  },
  reconnect: async () => {
    const response = await api.post('/whatsapp/reconnect', {}, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
      },
    })
    return response.data
  },
}

// Admins API
export const adminsApi = {
  getAll: async (): Promise<Admin[]> => {
    const response = await api.get('/admin/admins')
    return response.data.data || []
  },
  getById: async (id: string): Promise<Admin> => {
    const response = await api.get(`/admin/admins/${id}`)
    return response.data.data
  },
  create: async (data: { username: string; password: string; email?: string; role?: 'SUPER_ADMIN' | 'ADMIN' }) => {
    const response = await api.post('/admin/admins', data)
    return response.data
  },
  update: async (id: string, data: { username?: string; email?: string; role?: 'SUPER_ADMIN' | 'ADMIN'; isActive?: boolean }) => {
    const response = await api.put(`/admin/admins/${id}`, data)
    return response.data
  },
  updatePassword: async (id: string, password: string) => {
    const response = await api.put(`/admin/admins/${id}/password`, { password })
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/admin/admins/${id}`)
    return response.data
  },
}

export default api
