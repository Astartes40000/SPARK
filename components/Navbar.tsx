'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Shield, Bell, Search, LogOut, User, Settings, Users, History, Clock, BarChart2, Zap, Menu, X } from 'lucide-react'
import NotificationToast from './NotificationToast'

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newNotification, setNewNotification] = useState<{ message: string; consultationId?: string } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const navMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

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

    // Get user ID for filtered realtime subscription
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

  // Close menus on outside mousedown
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

  // Clear search when changing section
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

  // Search adapts to current section
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

        {/* Hamburger — leftmost */}
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

          {/* Notifications */}
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
