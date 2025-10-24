import { onMount } from 'solid-js'
import { exchangeSpotifyCode } from '../auth/spotifyAuth'
import { spotifyClientId } from '../state/credentials'

export default function CallbackSpotify() {
  onMount(async () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    // const state = params.get('state')
    if (error) {
      alert('Spotify auth error: ' + error)
      window.location.replace('/')
      return
    }
    if (!code) {
      alert('Missing Spotify code')
      window.location.replace('/')
      return
    }
    try {
      const base = window.location.origin + (import.meta as any).env.BASE_URL.replace(/\/$/, '')
      await exchangeSpotifyCode({ clientId: spotifyClientId(), code, redirectUri: base + '/callback/spotify' })
      window.history.replaceState({}, '', (import.meta as any).env.BASE_URL || '/')
      window.location.replace('/connect')
    } catch (e: any) {
      alert('Spotify token exchange failed')
      window.location.replace('/')
    }
  })
  return <p>Completing Spotify authentication…</p>
}
