import {
  CalendarDaysIcon,
  MenuIcon,
  TicketIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ShieldIcon,
  LogOutIcon,
  SettingsIcon,
  HomeIcon,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function NavLink({ to, children }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link
      to={to}
      className={
        active
          ? 'text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground transition-colors'
      }
    >
      {children}
    </Link>
  )
}

export function Layout({ children }) {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const isOrganizer = user?.roles?.includes('organizer')
  const isSponsor   = user?.roles?.includes('sponsor')
  const isAdmin     = user?.roles?.includes('admin')

  const isAttendee = isAuthenticated && !isAdmin && !isOrganizer && !isSponsor

  // Each role sees only their own links — no overlap
  const navLinks = [
    { to: '/', label: 'Events', icon: TicketIcon },
    { to: '/calendar', label: 'Calendar', icon: CalendarDaysIcon },
    ...(isAdmin
      ? [{ to: '/admin',            label: 'Admin',        icon: LayoutDashboardIcon }]
      : isOrganizer
        ? [{ to: '/organizer/events', label: 'Workspace',    icon: UsersIcon }]
        : isSponsor
          ? [{ to: '/sponsor',          label: 'Sponsorships', icon: ShieldIcon }]
          : isAttendee
            ? [{ to: '/attendee',       label: 'My Dashboard', icon: HomeIcon }]
            : []
    ),
  ]

  /* ── Mobile sheet nav links (all in one place) ── */
  const sheetLinks = [
    ...navLinks,
    ...(isAuthenticated
      ? [
          { to: '/me/profile', label: 'My profile', icon: SettingsIcon },
          { to: '/me/registrations', label: 'My registrations', icon: TicketIcon },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 h-14">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold select-none">
              EH
            </span>
            <span className="hidden sm:inline">EventHub</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* ── Authenticated: Avatar dropdown ── */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="cursor-pointer transition-all hover:opacity-80">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary select-none">
                      {initials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  {/* User info header */}
                  <DropdownMenuLabel className="py-2">
                    <p className="font-semibold truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">
                      {user?.email}
                    </p>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  {/* Account links */}
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate('/me/profile')}>
                      <SettingsIcon className="size-4" />
                      My profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/me/registrations')}>
                      <TicketIcon className="size-4" />
                      My registrations
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  {/* Role-specific shortcuts */}
                  {(isAdmin || isOrganizer || isSponsor || isAttendee) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => navigate('/admin')}>
                            <LayoutDashboardIcon className="size-4" />
                            Admin dashboard
                          </DropdownMenuItem>
                        )}
                        {isOrganizer && (
                          <DropdownMenuItem onClick={() => navigate('/organizer/events')}>
                            <UsersIcon className="size-4" />
                            My workspace
                          </DropdownMenuItem>
                        )}
                        {isSponsor && (
                          <DropdownMenuItem onClick={() => navigate('/sponsor')}>
                            <ShieldIcon className="size-4" />
                            Sponsorships
                          </DropdownMenuItem>
                        )}
                        {isAttendee && (
                          <DropdownMenuItem onClick={() => navigate('/attendee')}>
                            <HomeIcon className="size-4" />
                            My dashboard
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => logout()}>
                    <LogOutIcon className="size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Guest buttons (desktop only) */}
            {!isAuthenticated && (
              <div className="hidden md:flex gap-2">
                <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} to="/login">
                  Log in
                </Link>
                <Link className={buttonVariants({ size: 'sm' })} to="/register">
                  Sign up
                </Link>
              </div>
            )}

            {/* ── Mobile hamburger ── */}
            <Sheet>
              <SheetTrigger className={buttonVariants({ variant: 'ghost', size: 'icon-sm' }) + ' md:hidden'}>
                <MenuIcon className="size-4" />
                <span className="sr-only">Open menu</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 flex flex-col gap-0 pt-0">
                <SheetHeader className="px-4 py-4 border-b">
                  <SheetTitle className="text-left text-base">
                    {isAuthenticated ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initials(user?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-sm">{user?.name}</p>
                          <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
                        </div>
                      </div>
                    ) : (
                      'Menu'
                    )}
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
                  {sheetLinks.map((l, i) => {
                    const Icon = l.icon
                    /* Insert a separator before account links */
                    const isBoundary = isAuthenticated && i === navLinks.length
                    return (
                      <div key={l.to}>
                        {isBoundary && <Separator className="my-2" />}
                        <Link
                          to={l.to}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Icon className="size-4 shrink-0" />
                          {l.label}
                        </Link>
                      </div>
                    )
                  })}
                </nav>

                <div className="px-3 pb-4 border-t pt-3">
                  {isAuthenticated ? (
                    <button
                      type="button"
                      className={buttonVariants({ variant: 'outline' }) + ' w-full gap-2'}
                      onClick={() => logout()}
                    >
                      <LogOutIcon className="size-4" />
                      Log out
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link className={buttonVariants({ variant: 'outline' }) + ' w-full text-center'} to="/login">
                        Log in
                      </Link>
                      <Link className={buttonVariants() + ' w-full text-center'} to="/register">
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
