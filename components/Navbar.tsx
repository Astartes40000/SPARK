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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const navMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark-mode')
    }
  }, [])

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator)) return
    if (!('PushManager' in window)) return
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
      if (res.ok) setPushEnabled(true)
    } catch (e) {
      console.error('Push subscription failed:', e)
    }
  }

  const toggleTheme = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    if (next) {
      document.documentElement.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
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

      // Poll for new notifications every 10 seconds (works on corporate networks)
      let knownIds = new Set<string>()
      let firstPoll = true

      const poll = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*, profiles!notifications_from_user_id_fkey(full_name)')
          .eq('user_id', user.id).eq('read', false)
          .order('created_at', { ascending: false }).limit(10)

        const newNotifs = data || []
        setNotifications(newNotifs)

        if (firstPoll) {
          // On first poll just record existing IDs, don't show toast
          knownIds = new Set(newNotifs.map((n: any) => n.id))
          firstPoll = false
          return
        }

        // Find genuinely new notifications
        const brandNew = newNotifs.filter((n: any) => !knownIds.has(n.id))
        if (brandNew.length > 0) {
          const latest = brandNew[0]
          const consultationId = latest?.consultation_id
          if (latest?.type === 'sme_answer') {
            setNewNotification({ message: 'Your consultation has been assigned or updated', consultationId })
          } else if (latest?.type === 'reply') {
            setNewNotification({ message: 'Someone replied to your consultation', consultationId })
          } else {
            setNewNotification({ message: 'You have a new notification' })
          }
          setTimeout(() => setNewNotification(null), 100)
          knownIds = new Set(newNotifs.map((n: any) => n.id))
        }
      }

      poll()
      const interval = setInterval(poll, 10000)
      return () => clearInterval(interval)
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

  useEffect(() => { setSearchQuery('') }, [pathname])

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
    admin: 'bg-red-100 text-red-700 border border-red-200',
    sme: 'bg-green-100 text-green-700 border border-green-200',
    investigator: 'bg-blue-100 text-blue-700 border border-blue-200',
    radar_advisor: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
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

  const activeStyle = { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' }
  const inactiveStyle = { color: 'var(--text-muted)', border: '1px solid var(--border)' }

  const searchConfig: Record<string, { placeholder: string; target: string }> = {
    '/dashboard': { placeholder: 'Search cases...', target: '/dashboard' },
    '/dashboard/smes': { placeholder: "Search SME's...", target: '/dashboard/smes' },
    '/dashboard/radar': { placeholder: 'Search RADAR Advisors...', target: '/dashboard/radar' },
    '/dashboard/history': { placeholder: 'Search archive...', target: '/dashboard/history' },
  }
  const currentSearch = searchConfig[pathname] || searchConfig['/dashboard']

  return (
    <nav style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }} className="sticky top-0 z-50 shadow-sm">
      <NotificationToast newNotification={newNotification} />
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Hamburger */}
        <div ref={navMenuRef} className="relative shrink-0">
          <button onClick={() => setShowNavMenu((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
            style={showNavMenu ? activeStyle : inactiveStyle}>
            {showNavMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {showNavMenu && (
            <div className="absolute left-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              {menuLinks.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setShowNavMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-all"
                  style={{ color: isActive(item.href) ? '#E68A00' : 'var(--text-dim)', background: isActive(item.href) ? 'rgba(255,153,0,0.08)' : 'transparent', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { if (!isActive(item.href)) { e.currentTarget.style.background = 'rgba(255,153,0,0.06)'; e.currentTarget.style.color = '#E68A00' }}}
                  onMouseLeave={(e) => { if (!isActive(item.href)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)' }}}>
                  <span style={{ color: isActive(item.href) ? '#FF9900' : 'var(--text-muted)' }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              {/* Settings section */}
              <div className="px-4 pt-3 pb-1" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Settings</p>
              </div>

              {/* Notifications toggle */}
              {isMounted && (
                <button onClick={() => { if (!pushEnabled) handleEnablePush() }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-sm transition-all"
                  style={{ color: pushEnabled ? '#16A34A' : 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,153,0,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ color: pushEnabled ? '#16A34A' : 'var(--text-muted)' }}>
                    {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 text-left">{pushEnabled ? 'Notifications enabled' : 'Enable Notifications'}</span>
                  {pushEnabled && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.12)', color: '#16A34A' }}>ON</span>}
                </button>
              )}

              {/* Dark mode toggle */}
              <button onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 w-full text-sm transition-all"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,153,0,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {isDarkMode ? <Sun className="w-4 h-4" style={{ color: '#FF9900' }} /> : <Moon className="w-4 h-4" />}
                </span>
                <span className="flex-1 text-left">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                <div className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                  style={{ background: isDarkMode ? '#FF9900' : 'var(--border)', border: '1px solid', borderColor: isDarkMode ? '#FF9900' : 'var(--border)' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ background: isDarkMode ? '#ffffff' : 'var(--text-muted)', left: isDarkMode ? '18px' : '2px' }} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div style={{ background: 'linear-gradient(135deg, #E68A00, #FF9900)', boxShadow: '0 2px 8px rgba(255,153,0,0.4)' }}
            className="w-8 h-8 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold hidden sm:block tracking-tight" style={{ color: 'var(--text)' }}>
            Safe<span style={{ color: '#FF9900' }}>-T</span>
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
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
              className="relative p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,153,0,0.08)'; e.currentTarget.style.color = '#FF9900' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-white rounded-full flex items-center justify-center font-bold"
                  style={{ background: '#FF9900', fontSize: '9px' }}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden z-50"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Notifications</span>
                  {notifications.length > 0 && <button onClick={markAllRead} className="text-xs" style={{ color: '#FF9900' }}>Mark all read</button>}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0
                    ? <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>No new notifications</p>
                    : notifications.map((n) => (
                      <div key={n.id} onClick={() => { setShowNotifications(false); if (n.consultation_id) router.push(`/dashboard/consult/${n.consultation_id}`) }}
                        className="px-4 py-3 cursor-pointer text-sm" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,153,0,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <span className="font-medium" style={{ color: 'var(--text)' }}>{n.profiles?.full_name || 'Someone'}</span>
                        {' '}{n.type === 'sme_answer' ? 'updated your consultation' : 'replied'}
                        {n.consultation_id && <span className="block text-xs mt-0.5" style={{ color: '#FF9900' }}>Click to view →</span>}
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
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,153,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                  style={{ background: 'linear-gradient(135deg, #E68A00, #FF9900)' }}>
                  {profile.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium hidden sm:block ${roleBadge[profile.role] || roleBadge.investigator}`}>
                  {profile.role.replace('_', ' ').toUpperCase()}
                </span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{profile.full_name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{profile.email}</p>
                  </div>
                  {[
                    { href: '/dashboard/profile', icon: <User className="w-4 h-4" />, label: 'Profile', show: true },
                    { href: '/dashboard/settings/schedule', icon: <Clock className="w-4 h-4" />, label: 'My Schedule', show: profile.role === 'sme' },
                    { href: '/dashboard/admin', icon: <Settings className="w-4 h-4" />, label: 'Admin Panel', show: profile.role === 'admin' },
                    { href: '/dashboard/admin/metrics', icon: <BarChart2 className="w-4 h-4" />, label: 'Metrics', show: profile.role === 'admin' },
                  ].filter((i) => i.show).map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-dim)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,153,0,0.08)'; e.currentTarget.style.color = '#E68A00' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)' }}>
                      {item.icon} {item.label}
                    </Link>
                  ))}
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                    style={{ color: '#DC2626', borderTop: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.08)')}
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
