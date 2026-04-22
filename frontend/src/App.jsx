import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { AdminPage } from '@/pages/AdminPage'
import { AttendeeDashboardPage } from '@/pages/AttendeeDashboardPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { OrganizerEventsPage } from '@/pages/OrganizerEventsPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { RegistrationsPage } from '@/pages/RegistrationsPage'
import { SponsorDashboardPage } from '@/pages/SponsorDashboardPage'
import { ProfilePage } from '@/pages/ProfilePage'

function Protected({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RoleOnly({ role, children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }
  const roles = Array.isArray(role) ? role : [role]
  if (!roles.some((r) => user?.roles?.includes(r))) {
    return <Navigate to="/" replace />
  }
  return children
}

function AdminOnly({ children }) {
  return <RoleOnly role="admin">{children}</RoleOnly>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-right" richColors />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route
            path="/attendee"
            element={
              <Protected>
                <RoleOnly role={['attendee']}>
                  <AttendeeDashboardPage />
                </RoleOnly>
              </Protected>
            }
          />
          <Route
            path="/me/registrations"
            element={
              <Protected>
                <RegistrationsPage />
              </Protected>
            }
          />
          <Route
            path="/me/profile"
            element={
              <Protected>
                <ProfilePage />
              </Protected>
            }
          />
          <Route
            path="/organizer/events"
            element={
              <Protected>
                <RoleOnly role={['organizer', 'admin']}>
                  <OrganizerEventsPage />
                </RoleOnly>
              </Protected>
            }
          />
          <Route
            path="/organizer/attendance"
            element={<Navigate to="/organizer/events" replace />}
          />
          <Route
            path="/sponsor"
            element={
              <Protected>
                <RoleOnly role={['sponsor', 'admin']}>
                  <SponsorDashboardPage />
                </RoleOnly>
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected>
                <AdminOnly>
                  <AdminPage />
                </AdminOnly>
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
