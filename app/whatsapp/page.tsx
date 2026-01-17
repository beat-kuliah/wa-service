'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { whatsappApi, WhatsAppStatus, QRCodeResponse } from '@/lib/api'

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async () => {
    try {
      const data = await whatsappApi.getStatus()
      setStatus(data)
      if (data.hasQR && !qrCode) {
        loadQRCode()
      } else if (!data.hasQR) {
        setQrCode(null)
      }
    } catch (error) {
      console.error('Error loading status:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQRCode = async () => {
    try {
      setQrLoading(true)
      const data = await whatsappApi.getQR()
      setQrCode(data.qrCode)
    } catch (error) {
      console.error('Error loading QR code:', error)
    } finally {
      setQrLoading(false)
    }
  }

  const handleReconnect = async () => {
    if (!confirm('Are you sure you want to reconnect WhatsApp? This will generate a new QR code.')) return
    
    try {
      await whatsappApi.reconnect()
      setTimeout(() => {
        loadStatus()
      }, 2000)
    } catch (error) {
      console.error('Error reconnecting:', error)
      alert('Failed to reconnect')
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Connection</h1>
          <p className="text-gray-600 mt-2">Kelola koneksi WhatsApp</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading status...</p>
            </div>
          </div>
        ) : status ? (
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              status.connected ? 'border-green-500' : 'border-red-500'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {status.connected ? '✅ Connected' : '❌ Disconnected'}
                  </h2>
                  <p className="text-gray-600">
                    <span className="font-medium">State:</span> {status.state}
                  </p>
                  {status.hasQR && (
                    <p className="text-yellow-600 mt-2">
                      ⚠️ QR Code available - Please scan to connect
                    </p>
                  )}
                </div>
                <button
                  onClick={handleReconnect}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reconnect
                </button>
              </div>
            </div>

            {/* QR Code */}
            {status.hasQR && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">QR Code</h3>
                {qrLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading QR code...</p>
                    </div>
                  </div>
                ) : qrCode ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className="border-4 border-gray-200 rounded-lg mb-4"
                    />
                    <p className="text-gray-600 text-sm">
                      Scan QR code ini dengan WhatsApp mobile app untuk menghubungkan
                    </p>
                    <button
                      onClick={loadQRCode}
                      className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Refresh QR Code
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={loadQRCode}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Load QR Code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Connection Info */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Connection Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Connection Status:</span>
                  <span className={`font-semibold ${
                    status.connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {status.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">State:</span>
                  <span className="font-semibold text-gray-900">{status.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">QR Code Available:</span>
                  <span className={`font-semibold ${
                    status.hasQR ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {status.hasQR ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load WhatsApp status</p>
          </div>
        )}
      </div>
    </div>
  )
}
