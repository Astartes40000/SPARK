'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Toast {
  id: string
  message: string
  consultationId?: string
}

interface NotificationToastProps {
  newNotification: { message: string; consultationId?: string } | null
}

export default function NotificationToast({ newNotification }: NotificationToastProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const router = useRouter()

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.4)
    } catch (e) {}
  }

  useEffect(() => {
    if (!newNotification) return
    const toast: Toast = { id: Date.now().toString(), message: newNotification.message, consultationId: newNotification.consultationId }
    setToasts((prev) => [...prev, toast])
    playSound()
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 5000)
  }, [newNotification])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const handleClick = (toast: Toast) => {
    if (toast.consultationId) router.push(`/dashboard/consult/${toast.consultationId}`)
    dismiss(toast.id)
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} onClick={() => handleClick(toast)}
          className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer shadow-lg"
          style={{ background: '#FFFFFF', border: '1px solid rgba(255,153,0,0.4)', boxShadow: '0 4px 16px rgba(255,153,0,0.15)', minWidth: '280px', maxWidth: '360px', animation: 'slideIn 0.3s ease' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,153,0,0.12)' }}>
            <Bell className="w-4 h-4" style={{ color: '#FF9900' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#FF9900' }}>New Notification</p>
            <p className="text-sm" style={{ color: '#0F172A' }}>{toast.message}</p>
            {toast.consultationId && <p className="text-xs mt-1" style={{ color: '#64748B' }}>Click to view</p>}
          </div>
          <button onClick={(e) => { e.stopPropagation(); dismiss(toast.id) }} className="shrink-0 p-0.5 rounded" style={{ color: '#64748B' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  )
}
