import { setSpotifyTokens } from '../state/auth'

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(input: string) {
  const enc = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return base64UrlEncode(digest)
}

function randomString(len = 64) {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => ('0' + b.toString(16)).slice(-2)).join('')
}

const SPOTIFY_AUTH = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN = 'https://accounts.spotify.com/api/token'

export async function beginSpotifyAuth(opts: { clientId: string; redirectUri: string; scopes: string[] }) {
  const state = randomString(16)
  const verifier = randomString(64)
  const challenge = await sha256(verifier)
  sessionStorage.setItem('spotify_pkce_verifier', verifier)
  sessionStorage.setItem('spotify_state', state)
  const params = new URLSearchParams({
    client_id: opts.clientId,
    response_type: 'code',
    redirect_uri: opts.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: opts.scopes.join(' '),
  })
  window.location.href = `${SPOTIFY_AUTH}?${params.toString()}`
}

export async function exchangeSpotifyCode(opts: { clientId: string; code: string; redirectUri: string }) {
  const verifier = sessionStorage.getItem('spotify_pkce_verifier') || ''
  const body = new URLSearchParams({
    client_id: opts.clientId,
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: verifier,
  })
  const res = await fetch(SPOTIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`)
  const json = await res.json()
  setSpotifyTokens({ ...json, obtained_at: Math.floor(Date.now() / 1000) })
}

export async function refreshSpotifyToken(opts: { clientId: string; refreshToken: string }) {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    grant_type: 'refresh_token',
    refresh_token: opts.refreshToken,
  })
  const res = await fetch(SPOTIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Spotify refresh failed: ${res.status}`)
  const json = await res.json()
  setSpotifyTokens({ ...json, refresh_token: json.refresh_token ?? opts.refreshToken, obtained_at: Math.floor(Date.now() / 1000) })
}

export const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'playlist-modify-public',
  'playlist-modify-private',
]
