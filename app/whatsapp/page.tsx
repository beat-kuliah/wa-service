'use client'

import { useEffect, useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { whatsappApi, WhatsAppStatus, QRCodeResponse } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false)
  const isQrLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const loadStatus = async (showRefreshing = false) => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      console.log('⏸️ Load status already in progress, skipping...')
      return
    }
    
    isLoadingRef.current = true
    
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      const data = await whatsappApi.getStatus()
      setStatus(data)
      hasLoadedRef.current = true
      // Don't auto-load QR code - let user click button
    } catch (error: any) {
      console.error('Error loading status:', error)
      setError(error?.response?.data?.message || error?.message || 'Failed to load WhatsApp status')
    } finally {
      setLoading(false)
      setRefreshing(false)
      isLoadingRef.current = false
    }
  }

  useEffect(() => {
    // Only call once on mount - check ref to prevent multiple calls
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadStatus()
      
      // IMPORTANT: Also refresh after a short delay to catch connection state
      // This is especially important right after server startup when WhatsApp might have just connected
      // The initial loadStatus() might happen before state is fully synced
      setTimeout(() => {
        if (!isLoadingRef.current) {
          console.log('🔄 Refreshing status after initial load to catch connection state...')
          loadStatus(true).catch(console.error)
        }
      }, 1500) // Refresh after 1.5 seconds
    }
    
    // Auto-refresh status every 3 seconds to catch connection state changes
    // This ensures that if WhatsApp connects after page load, state will update
    const statusInterval = setInterval(() => {
      // Only refresh if not currently loading and not showing refreshing state
      if (!isLoadingRef.current && !refreshing) {
        loadStatus(true).catch(console.error)
      }
    }, 3000) // Refresh every 3 seconds
    
    // Cleanup on unmount
    return () => {
      // Reset refs on unmount to allow fresh load on remount
      isLoadingRef.current = false
      isQrLoadingRef.current = false
      clearInterval(statusInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadQRCode = async () => {
    // Prevent multiple simultaneous calls
    if (isQrLoadingRef.current) {
      console.log('⏸️ Load QR code already in progress, skipping...')
      return
    }
    
    isQrLoadingRef.current = true
    
    try {
      setQrLoading(true)
      setError(null)
      
      // Refresh status first to get latest state
      await loadStatus(true)
      
      // Don't load QR if already connected
      if (status?.connected) {
        setError('WhatsApp sudah terhubung. QR code tidak diperlukan.')
        setQrLoading(false)
        isQrLoadingRef.current = false
        return
      }
      
      console.log('🔄 Requesting QR code...')
      const data = await whatsappApi.getQR()
      
      console.log('📥 QR Code response received:', { 
        hasQrCode: !!data?.qrCode, 
        qrCodeLength: data?.qrCode?.length,
        expiresIn: data?.expiresIn
      })
      
      if (!data) {
        throw new Error('No data received from server')
      }
      
      if (data.qrCode) {
        // Validate QR code format (should be data URL)
        if (data.qrCode.startsWith('data:image/')) {
          setQrCode(data.qrCode)
          console.log('✅ QR Code set successfully')
          // Refresh status to ensure UI is up-to-date (but don't wait, do it in background)
          loadStatus(true).catch(console.error)
        } else {
          console.error('❌ Invalid QR code format:', data.qrCode.substring(0, 100))
          setError('Format QR code tidak valid. Silakan coba lagi.')
          setQrCode(null)
        }
      } else {
        console.warn('⚠️ No QR code in response')
        setError('QR code tidak tersedia. Pastikan WhatsApp belum terhubung.')
        // Refresh status to check if connected now
        await loadStatus(true)
      }
    } catch (error: any) {
      console.error('❌ Error loading QR code:', error)
      
      // Extract error message
      let errorMessage = 'Gagal memuat QR code'
      
      if (error?.response?.data) {
        // API error response
        errorMessage = error.response.data.message || error.response.data.error || errorMessage
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      // Show user-friendly message for specific errors
      if (errorMessage.includes('already connected') || errorMessage.includes('No QR code needed')) {
        setError('WhatsApp sudah terhubung. QR code tidak diperlukan.')
        // Refresh status to update UI
        await loadStatus(true)
      } else if (errorMessage.includes('timeout')) {
        setError('Timeout saat memuat QR code. Silakan coba lagi.')
        await loadStatus(true)
      } else if (errorMessage.includes('not ready') || errorMessage.includes('Failed to initialize')) {
        setError('WhatsApp client belum siap. Silakan tunggu sebentar dan coba lagi.')
        await loadStatus(true)
      } else {
        setError(errorMessage)
        // Refresh status to get latest state
        await loadStatus(true)
      }
      
      setQrCode(null)
    } finally {
      setQrLoading(false)
      isQrLoadingRef.current = false
    }
  }

  const handleReconnect = async () => {
    if (!confirm('Are you sure you want to reconnect WhatsApp? This will generate a new QR code.')) return
    
    try {
      setError(null)
      await whatsappApi.reconnect()
      // Clear QR code and reload status
      setQrCode(null)
      setTimeout(() => {
        loadStatus(true)
      }, 2000)
    } catch (error: any) {
      console.error('Error reconnecting:', error)
      setError(error?.response?.data?.message || error?.message || 'Failed to reconnect')
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">WhatsApp Connection</h1>
          <p className="text-muted-foreground mt-2">Kelola koneksi WhatsApp</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading status...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : status ? (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className={cn(
              "border-l-4",
              status.connected ? "border-primary" : "border-destructive"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {status.connected ? (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      ) : (
                        <XCircle className="w-6 h-6 text-destructive" />
                      )}
                      <h2 className="text-2xl font-bold">
                        {status.connected ? 'Connected' : 'Disconnected'}
                      </h2>
                      <Badge variant={status.connected ? "default" : "destructive"}>
                        {status.state}
                      </Badge>
                    </div>
                    {status.hasQR && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm">QR Code available - Please scan to connect</p>
                      </div>
                    )}
                    {error && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => loadStatus(true)}
                      variant="outline"
                      disabled={refreshing}
                    >
                      <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
                      Refresh
                    </Button>
                    <Button onClick={handleReconnect}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconnect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code - Always show, not just when hasQR */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                {qrLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading QR code...</p>
                    </div>
                  </div>
                ) : qrCode ? (
                  <div className="flex flex-col items-center space-y-4">
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className="border-2 border-border rounded-lg p-2 bg-white max-w-xs"
                      onError={(e) => {
                        console.error('QR code image failed to load')
                        setQrCode(null)
                        setError('Failed to display QR code image')
                      }}
                    />
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Scan QR code ini dengan WhatsApp mobile app untuk menghubungkan
                    </p>
                    <Button variant="outline" onClick={loadQRCode} disabled={qrLoading || status?.connected}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    {status.connected ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          WhatsApp sudah terhubung. QR code tidak diperlukan.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Jika ingin menghubungkan ulang, gunakan tombol "Reconnect" di atas.
                        </p>
                      </div>
                    ) : (
                      <>
                        {!status.hasQR && (
                          <p className="text-sm text-muted-foreground mb-4">
                            QR code tidak tersedia saat ini. Klik tombol di bawah untuk mencoba memuat QR code.
                          </p>
                        )}
                        <Button onClick={loadQRCode} disabled={qrLoading || status.connected}>
                          <QrCode className="w-4 h-4 mr-2" />
                          {qrLoading ? 'Loading...' : 'Load QR Code'}
                        </Button>
                        {error && (
                          <p className="text-sm text-destructive mt-2">{error}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Info */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Connection Status:</span>
                    <Badge variant={status.connected ? "default" : "destructive"}>
                      {status.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">State:</span>
                    <span className="font-semibold">{status.state}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">QR Code Available:</span>
                    <Badge variant={status.hasQR ? "secondary" : "outline"}>
                      {status.hasQR ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <p className="text-destructive">Failed to load WhatsApp status</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
