'use client'

import { useEffect, useState } from 'react'
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
                  </div>
                  <Button onClick={handleReconnect}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            {status.hasQR && (
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
                        className="border-2 border-border rounded-lg p-2 bg-white"
                      />
                      <p className="text-sm text-muted-foreground text-center max-w-md">
                        Scan QR code ini dengan WhatsApp mobile app untuk menghubungkan
                      </p>
                      <Button variant="outline" onClick={loadQRCode}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh QR Code
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Button onClick={loadQRCode}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Load QR Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
