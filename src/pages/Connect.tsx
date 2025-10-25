import { createMemo, Show } from 'solid-js'
import { A } from '@solidjs/router'
import { spotifyClientId } from '../state/credentials'
import { SPOTIFY_SCOPES, beginSpotifyAuth } from '../auth/spotifyAuth'
import { spotifyTokens } from '../state/auth'
import { getYouTubeToken, YOUTUBE_SCOPES } from '../auth/googleAuth'
import { googleClientId } from '../state/credentials'

export default function Connect() {
  const baseUrl = window.location.origin + (import.meta as any).env.BASE_URL.replace(/\/$/, '')
  const redirectUri = baseUrl + '/callback/spotify'

  const spotifyReady = createMemo(() => !!spotifyTokens())

  async function connectSpotify() {
    if (!spotifyClientId()) return alert('Enter Spotify Client ID in Setup')
    await beginSpotifyAuth({ clientId: spotifyClientId(), redirectUri, scopes: SPOTIFY_SCOPES })
  }

  async function connectGoogle() {
    if (!googleClientId()) return alert('Enter Google Client ID in Setup')
    try { await getYouTubeToken(googleClientId(), YOUTUBE_SCOPES) } catch (e: any) { alert('Google auth failed') }
  }

  return (
    <div class="card" style={{ 'text-align': 'left', 'max-width': '820px', margin: '0 auto' }}>
      <h3>2) Connect accounts</h3>
      <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
        <button onClick={connectSpotify}>Connect Spotify</button>
        <Show when={spotifyReady()} fallback={<span>Not connected</span>}>
          <span>Connected</span>
        </Show>
      </div>
      <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center', 'margin-top': '0.75rem' }}>
        <button onClick={connectGoogle}>Connect Google (YouTube)</button>
      </div>

      <p style={{ 'margin-top': '1rem' }}>Proceed to pick playlists once both are connected.</p>
      <A href="/pick"><button disabled={!spotifyReady()}>Continue → Pick</button></A>
    </div>
  )
}
