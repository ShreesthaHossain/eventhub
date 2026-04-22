import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Lazy singleton — only initialize when something actually subscribes.
// This keeps startup resilient when VITE_REVERB_* env vars are missing
// (e.g. on Vercel where no Reverb server is deployed), otherwise
// `new Echo({ key: undefined })` can throw at module load and leave
// the whole app with a blank white screen.
let _echo = null
let _warned = false

function getEcho() {
  if (_echo) return _echo

  const key = import.meta.env.VITE_REVERB_APP_KEY
  if (!key) {
    if (!_warned) {
      // eslint-disable-next-line no-console
      console.warn(
        '[echo] VITE_REVERB_APP_KEY is not set — real-time features disabled.',
      )
      _warned = true
    }
    return null
  }

  if (typeof window !== 'undefined' && !window.Pusher) {
    window.Pusher = Pusher
  }

  try {
    _echo = new Echo({
      broadcaster: 'reverb',
      key,
      wsHost: import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',
      wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
      wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[echo] Failed to initialize — real-time disabled.', err)
    _echo = null
  }

  return _echo
}

// Null-safe proxy so callers can still do `echo.channel(...).listen(...)`
// without needing to null-check every time.
const echo = {
  channel(name) {
    const e = getEcho()
    if (!e) return { listen: () => ({ stopListening: () => {} }) }
    return e.channel(name)
  },
  leaveChannel(name) {
    const e = _echo
    if (e) e.leaveChannel(name)
  },
  leave(name) {
    const e = _echo
    if (e) e.leave(name)
  },
  get instance() {
    return getEcho()
  },
}

export default echo
