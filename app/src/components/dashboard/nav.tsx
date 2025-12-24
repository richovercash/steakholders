'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Truck,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Search,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { NotificationBell } from '@/components/notifications'
import type { User, Organization, NotificationWithRelations } from '@/types/database'

interface DashboardNavProps {
  user: User
  organization: Organization
  initialNotifications?: NotificationWithRelations[]
  initialUnreadCount?: number
}

export function DashboardNav({ user, organization, initialNotifications = [], initialUnreadCount = 0 }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isProducer = organization.type === 'producer'

  const navigation = isProducer
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Livestock', href: '/dashboard/livestock', icon: Truck },
        { name: 'Find Processors', href: '/dashboard/discover', icon: Search },
        { name: 'Orders', href: '/dashboard/orders', icon: ClipboardList },
        { name: 'Waitlist', href: '/dashboard/waitlist', icon: Clock },
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      ]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
        { name: 'Orders', href: '/dashboard/orders', icon: ClipboardList },
        { name: 'Waitlist', href: '/dashboard/waitlist', icon: Clock },
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b">
        <Link href="/dashboard" className="text-xl font-bold">
          <span className="text-green-800">Steak</span>
          <span className="text-amber-700">holders</span>
        </Link>
      </div>

      {/* Organization Badge */}
      <div className="px-4 py-3 border-b">
        <div className={`px-3 py-2 rounded-lg ${
          isProducer ? 'bg-green-50' : 'bg-amber-50'
        }`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {isProducer ? 'Producer' : 'Processor'}
          </p>
          <p className="font-medium text-gray-900 truncate">
            {organization.name}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? isProducer
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t px-3 py-4">
        <Link
          href="/dashboard/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/dashboard/settings'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <NavContent />
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-4 bg-white border-b px-4 h-16">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent />
          </SheetContent>
        </Sheet>

        <div className="flex-1">
          <span className="text-xl font-bold">
            <span className="text-green-800">Steak</span>
            <span className="text-amber-700">holders</span>
          </span>
        </div>

        <NotificationBell
          initialCount={initialUnreadCount}
          initialNotifications={initialNotifications}
          userId={user.id}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex lg:pl-64">
        <div className="sticky top-0 z-40 flex items-center justify-end gap-4 bg-white border-b px-6 h-16 w-full">
          <NotificationBell
            initialCount={initialUnreadCount}
            initialNotifications={initialNotifications}
            userId={user.id}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.full_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
}
