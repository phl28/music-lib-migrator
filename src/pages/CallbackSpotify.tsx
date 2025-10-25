import { onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { exchangeSpotifyCode } from '../auth/spotifyAuth'
import { spotifyClientId } from '../state/credentials'

export default function CallbackSpotify() {
  const nav = useNavigate()
  onMount(async () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    // const state = params.get('state')
    if (error) {
      alert('Spotify auth error: ' + error)
      nav('/', { replace: true })
      return
    }
    if (!code) {
      alert('Missing Spotify code')
      nav('/', { replace: true })
      return
    }
    try {
      const base = window.location.origin + (import.meta as any).env.BASE_URL.replace(/\/$/, '')
      await exchangeSpotifyCode({ clientId: spotifyClientId(), code, redirectUri: base + '/callback/spotify' })
      window.history.replaceState({}, '', (import.meta as any).env.BASE_URL || '/')
      nav('/connect', { replace: true })
    } catch (e: any) {
      alert('Spotify token exchange failed')
      nav('/', { replace: true })
    }
  })
  return <p>Completing Spotify authentication…</p>
}
