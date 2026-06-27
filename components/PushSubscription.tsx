'use client'

import { useEffect, useState } from 'react'
import { BellOff } from 'lucide-react'

export default function PushSubscription() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'granted') {
      // Already granted, silently subscribe
      registerAndSubscribe()
      return
    }
    if (Notification.permission === 'default') {
      // Show prompt button
      setShowPrompt(true)
    }
  }, [])

  const registerAndSubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
    } catch (e) {
      console.error('Push subscription failed:', e)
    }
  }

  const handleEnable = async () => {
    setShowPrompt(false)
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      await registerAndSubscribe()
    }
  }

  if (!showPrompt) return null

  return (
    <button
      onClick={handleEnable}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: 'rgba(168,85,247,0.15)',
        border: '1px solid rgba(168,85,247,0.4)',
        color: '#c084fc',
      }}
      title="Enable push notifications"
    >
      <BellOff className="w-3.5 h-3.5" />
      Enable Notifications
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
