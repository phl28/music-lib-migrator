import { createSignal } from 'solid-js'

type Creds = {
  spotifyClientId: string
  googleClientId: string
  persist: boolean
}

const STORAGE_KEY = 'migrator_creds_v1'

function load(): Creds | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Creds : null
  } catch {
    return null
  }
}

const initial = load()

export const [spotifyClientId, setSpotifyClientId] = createSignal<string>(initial?.spotifyClientId ?? '')
export const [googleClientId, setGoogleClientId] = createSignal<string>(initial?.googleClientId ?? '')
export const [persistCreds, setPersistCreds] = createSignal<boolean>(initial?.persist ?? false)

export function persistIfOpted() {
  if (persistCreds()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      spotifyClientId: spotifyClientId(),
      googleClientId: googleClientId(),
      persist: true,
    }))
  }
}

export function clearCreds() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function currentBaseUrl() {
  const base = (import.meta as any).env.BASE_URL || '/'
  const origin = window.location.origin
  return origin + base.replace(/\/$/, '')
}
