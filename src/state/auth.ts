import { createSignal } from 'solid-js'

export type SpotifyTokens = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token?: string
  scope?: string
  obtained_at: number
}

export const [spotifyTokens, setSpotifyTokens] = createSignal<SpotifyTokens | null>(null)

export function spotifyAccessTokenValid(): boolean {
  const t = spotifyTokens()
  if (!t) return false
  const now = Date.now() / 1000
  return now < t.obtained_at + t.expires_in - 30
}

export type GoogleAuth = {
  access_token: string
  expires_in: number
  scope: string
  token_type: 'Bearer'
  obtained_at: number
}

export const [googleAuth, setGoogleAuth] = createSignal<GoogleAuth | null>(null)

export function googleAccessTokenValid(): boolean {
  const t = googleAuth()
  if (!t) return false
  const now = Date.now() / 1000
  return now < t.obtained_at + t.expires_in - 30
}
