'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Shield, Bell, BellOff, Sun, Moon, Search, LogOut, User, Settings, Users, History, Clock, BarChart2, Zap, Menu, X } from 'lucide-react'
import NotificationToast from './NotificationToast'

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newNotification, setNewNotification] = useState<{ message: string; consultationId?: string } | null>(null)
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)
  const [isDayMode, setIsDayMode] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const navMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted')
    }
    const saved = localStorage.getItem('theme')
    if (saved === 'day') {
      setIsDayMode(true)
      document.documentElement.classList.add('day-mode')
    }
  }, [])

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator)) { console.log('Service workers not supported'); return }
    if (!('PushManager' in window)) { console.log('PushManager not supported'); return }
    try {
      console.log('Requesting permission...')
      const permission = await Notification.requestPermission()
      console.log('Permission:', permission)
      if (permission !== 'granted') return
      console.log('Registering service worker...')
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('SW registered, waiting...')
      await navigator.serviceWorker.ready
      console.log('SW ready, subscribing...')
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      console.log('Subscription:', subscription)
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
      console.log('Save result:', res.status)
      setPushEnabled(true)
    } catch (e) {
      console.error('Push subscription failed:', e)
    }
  }

  const toggleTheme = () => {
    const next = !isDayMode
    setIsDayMode(next)
    if (next) {
      document.documentElement.classList.add('day-mode')
      localStorage.setItem('theme', 'day')
    } else {
      document.documentElement.classList.remove('day-mode')
      localStorage.setItem('theme', 'night')
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    const getNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('notifications')
          .select('*, profiles!notifications_from_user_id_fkey(full_name)')
          .eq('user_id', user.id).eq('read', false)
          .order('created_at', { ascending: false }).limit(10)
        setNotifications(data || [])
      }
    }
    getProfile()
    getNotifications()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const channel = supabase.channel(`notifications-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, async (payload) => {
          await getNotifications()
          const n = payload.new as any
          if (n.type === 'sme_answer') {
            setNewNotification({ message: 'An SME responded to your consultation', consultationId: n.consultation_id })
          } else if (n.type === 'reply') {
            setNewNotification({ message: 'Someone replied to your consultation', consultationId: n.consultation_id })
          } else {
            setNewNotification({ message: 'You have a new notification' })
          }
          setTimeout(() => setNewNotification(null), 100)
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
  }, [supabase])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (navMenuRef.current && !navMenuRef.current.contains(t)) setShowNavMenu(false)
      if (notifRef.current && !notifRef.current.contains(t)) setShowNotifications(false)
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setSearchQuery('')
  }, [pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) router.push(`${currentSearch.target}?search=${encodeURIComponent(searchQuery)}`)
  }

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
      setNotifications([])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleBadge: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border border-red-500/30',
    sme: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    investigator: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    radar_advisor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  }

  const menuLinks = [
    { href: '/dashboard', icon: <Zap className="w-4 h-4" />, label: 'Cases', show: true },
    { href: '/dashboard/smes', icon: <Users className="w-4 h-4" />, label: "SME's", show: profile?.role !== 'radar_advisor' },
    { href: '/dashboard/radar', icon: <span className="text-sm">📡</span>, label: 'RADAR Advisors', show: ['radar_advisor', 'admin', 'investigator'].includes(profile?.role || '') },
    { href: '/dashboard/history', icon: <History className="w-4 h-4" />, label: 'Archive', show: true },
    { href: '/dashboard/settings/schedule', icon: <Clock className="w-4 h-4" />, label: 'My Schedule', show: profile?.role === 'sme' },
    { href: '/dashboard/admin/metrics', icon: <BarChart2 className="w-4 h-4" />, label: 'Metrics', show: profile?.role === 'admin' },
    { href: '/dashboard/admin', icon: <Settings className="w-4 h-4" />, label: 'Admin Panel', show: profile?.role === 'admin' },
  ].filter((l) => l.show)

  const isActive = (href: string) => pathname === href

  const activeStyle = { background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }
  const inactiveStyle = { color: '#64748b', border: '1px solid #1e1e2e' }

  const searchConfig: Record<string, { placeholder: string; target: string }> = {
    '/dashboard': { placeholder: 'Search cases...', target: '/dashboard' },
    '/dashboard/smes': { placeholder: "Search SME's...", target: '/dashboard/smes' },
    '/dashboard/radar': { placeholder: 'Search RADAR Advisors...', target: '/dashboard/radar' },
    '/dashboard/history': { placeholder: 'Search archive...', target: '/dashboard/history' },
  }
  const currentSearch = searchConfig[pathname] || searchConfig['/dashboard']

  return (
    <nav style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid #1e1e2e', backdropFilter: 'blur(12px)' }} className="sticky top-0 z-50">
      <NotificationToast newNotification={newNotification} />
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Hamburger */}
        <div ref={navMenuRef} className="relative shrink-0">
          <button
            onClick={() => setShowNavMenu((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
            style={showNavMenu ? activeStyle : inactiveStyle}
          >
            {showNavMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {showNavMenu && (
            <div className="absolute left-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
              style={{ background: '#111118', border: '1px solid #1e1e2e', boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(168,85,247,0.1)' }}>

              {/* Nav links */}
              {menuLinks.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setShowNavMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-all"
                  style={{ color: isActive(item.href) ? '#c084fc' : '#94a3b8', background: isActive(item.href) ? 'rgba(168,85,247,0.08)' : 'transparent', borderBottom: '1px solid #1a1a28' }}
                  onMouseEnter={(e) => { if (!isActive(item.href)) { e.currentTarget.style.background = 'rgba(168,85,247,0.06)'; e.currentTarget.style.color = '#c084fc' }}}
                  onMouseLeave={(e) => { if (!isActive(item.href)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}}>
                  <span style={{ color: isActive(item.href) ? '#a855f7' : '#64748b' }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              {/* Settings section */}
              <div className="px-4 pt-3 pb-1" style={{ borderTop: '1px solid #1e1e2e' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Settings</p>
              </div>

              {/* Notifications toggle */}
              {isMounted && (
              <button
                onClick={() => { if (!pushEnabled) handleEnablePush() }}
                className="flex items-center gap-3 px-4 py-3 w-full text-sm transition-all"
                style={{ color: pushEnabled ? '#4ade80' : '#94a3b8', borderBottom: '1px solid #1a1a28' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: pushEnabled ? '#4ade80' : '#64748b' }}>
                  {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </span>
                <span className="flex-1 text-left">
                  {pushEnabled ? 'Notifications enabled' : 'Enable Notifications'}
                </span>
                {pushEnabled && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>ON</span>
                )}
              </button>
              )}

              {/* Day/Night toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 w-full text-sm transition-all"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: '#64748b' }}>
                  {isDayMode ? <Sun className="w-4 h-4" style={{ color: '#facc15' }} /> : <Moon className="w-4 h-4" />}
                </span>
                <span className="flex-1 text-left">{isDayMode ? 'Day Mode' : 'Night Mode'}</span>
                {/* Toggle pill */}
                <div className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                  style={{ background: isDayMode ? '#facc15' : '#1e1e2e', border: '1px solid', borderColor: isDayMode ? '#facc15' : '#334155' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ background: isDayMode ? '#0a0a0f' : '#64748b', left: isDayMode ? '18px' : '2px' }} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 16px rgba(168,85,247,0.5)' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white hidden sm:block tracking-tight">Safe<span style={{ color: '#a855f7' }}>-T</span></span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#64748b' }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentSearch.placeholder}
              className="input-dark text-sm w-full"
              style={{ height: '36px', paddingLeft: '2.25rem' }} />
          </div>
        </form>

        <div className="flex items-center gap-1.5">
          {/* Notifications bell */}
          <div ref={notifRef} className="relative">
            <button onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 rounded-lg transition-colors" style={{ color: '#64748b' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}>
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-white rounded-full flex items-center justify-center font-bold"
                  style={{ background: '#a855f7', boxShadow: '0 0 8px rgba(168,85,247,0.8)', fontSize: '9px' }}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden z-50"
                style={{ background: '#111118', border: '1px solid #1e1e2e', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e1e2e' }}>
                  <span className="font-semibold text-sm text-white">Notifications</span>
                  {notifications.length > 0 && <button onClick={markAllRead} className="text-xs" style={{ color: '#a855f7' }}>Mark all read</button>}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0
                    ? <p className="text-center text-xs py-8" style={{ color: '#64748b' }}>No new notifications</p>
                    : notifications.map((n) => (
                      <div key={n.id} onClick={() => setShowNotifications(false)}
                        className="px-4 py-3 cursor-pointer text-sm" style={{ borderBottom: '1px solid #1a1a28', color: '#94a3b8' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168,85,247,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <span className="font-medium text-white">{n.profiles?.full_name || 'Someone'}</span>
                        {' '}{n.type === 'sme_answer' ? 'responded to your consultation' : 'replied'}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          {profile && (
            <div ref={userMenuRef} className="relative">
              <button onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  {profile.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium hidden sm:block ${roleBadge[profile.role]}`}>
                  {profile.role.replace('_', ' ').toUpperCase()}
                </span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50"
                  style={{ background: '#111118', border: '1px solid #1e1e2e', boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(168,85,247,0.1)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e1e2e' }}>
                    <p className="font-semibold text-sm text-white truncate">{profile.full_name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{profile.email}</p>
                  </div>
                  {[
                    { href: '/dashboard/profile', icon: <User className="w-4 h-4" />, label: 'Profile', show: true },
                    { href: '/dashboard/settings/schedule', icon: <Clock className="w-4 h-4" />, label: 'My Schedule', show: profile.role === 'sme' },
                    { href: '/dashboard/admin', icon: <Settings className="w-4 h-4" />, label: 'Admin Panel', show: profile.role === 'admin' },
                    { href: '/dashboard/admin/metrics', icon: <BarChart2 className="w-4 h-4" />, label: 'Metrics', show: profile.role === 'admin' },
                  ].filter((i) => i.show).map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: '#94a3b8' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.color = '#c084fc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}>
                      {item.icon} {item.label}
                    </Link>
                  ))}
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                    style={{ color: '#ef4444', borderTop: '1px solid #1e1e2e' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
