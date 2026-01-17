'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/chats', label: 'Chats', icon: '💭' },
  { href: '/templates', label: 'Templates', icon: '📝' },
  { href: '/api-tokens', label: 'API Tokens', icon: '🔑' },
  { href: '/whatsapp', label: 'WhatsApp', icon: '📱' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">WA Service</h1>
        <p className="text-gray-400 text-sm">Dashboard</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-8 pt-8 border-t border-gray-700">
        <button
          onClick={() => {
            localStorage.removeItem('admin_token')
            window.location.href = '/login'
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span className="text-xl">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
