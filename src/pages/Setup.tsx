import { createMemo } from 'solid-js'
import { spotifyClientId, setSpotifyClientId, googleClientId, setGoogleClientId, persistCreds, setPersistCreds, persistIfOpted, currentBaseUrl } from '../state/credentials'

export default function Setup() {
  const baseUrl = createMemo(() => currentBaseUrl())
  const spotifyRedirect = createMemo(() => baseUrl() + '/callback/spotify')
  const googleRedirect = createMemo(() => baseUrl() + '/callback/google')

  return (
    <div class="card" style={{ 'text-align': 'left', 'max-width': '820px', margin: '0 auto' }}>
      <h3>1) Bring your own credentials</h3>
      <p>Paste your own Client IDs. IDs are not secrets. Tokens never leave your browser.</p>
      <label>Spotify Client ID
        <input style={{ width: '100%' }} value={spotifyClientId()} onInput={e => setSpotifyClientId(e.currentTarget.value.trim())} placeholder="e.g. 123abc..." />
      </label>
      <br />
      <label>Google OAuth Client ID (Web)
        <input style={{ width: '100%' }} value={googleClientId()} onInput={e => setGoogleClientId(e.currentTarget.value.trim())} placeholder="e.g. 123.apps.googleusercontent.com" />
      </label>
      <div style={{ 'margin-top': '0.5rem' }}>
        <label>
          <input type="checkbox" checked={persistCreds()} onChange={e => setPersistCreds(e.currentTarget.checked)} /> Remember in this browser
        </label>
        <button style={{ 'margin-left': '1rem' }} onClick={persistIfOpted}>Save</button>
      </div>

      <h4 style={{ 'margin-top': '1.5rem' }}>Spotify App setup</h4>
      <ol>
        <li>Go to https://developer.spotify.com/dashboard → Create an app</li>
        <li>Add Redirect URI: <code>{spotifyRedirect()}</code> (exact match required)</li>
        <li>Enable scopes at runtime; no client secret is used (PKCE)</li>
      </ol>

      <h4>Google Cloud OAuth Client (YouTube Data API v3)</h4>
      <ol>
        <li>Enable "YouTube Data API v3" in Google Cloud Console</li>
        <li>Create OAuth 2.0 Client ID → Application type: Web application</li>
        <li>Authorized JavaScript origins: <code>{window.location.origin}</code></li>
        <li>Authorized redirect URIs: <code>{googleRedirect()}</code> (not strictly needed for token client)</li>
      </ol>

      <p>Next: go to Connect to authorize accounts.</p>
      <a href="/connect"><button>Continue → Connect</button></a>
    </div>
  )
}
