import axios from 'axios'

const STORAGE_KEY = 'eventhub_token'
const baseURL = import.meta.env.VITE_API_BASE ?? '/api'

// Read the token synchronously so the Authorization header is present on the
// very first request — before any React useEffect has had a chance to run.
const _initialToken = localStorage.getItem(STORAGE_KEY)

export const api = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(_initialToken ? { Authorization: `Bearer ${_initialToken}` } : {}),
  },
})

/** Returns the home dashboard path for a given user object. */
export function dashboardPath(user) {
  const roles = user?.roles ?? []
  if (roles.includes('admin'))     return '/admin'
  if (roles.includes('organizer')) return '/organizer/events'
  if (roles.includes('sponsor'))   return '/sponsor'
  return '/attendee'
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}
