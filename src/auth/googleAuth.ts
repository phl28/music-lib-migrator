import { setGoogleAuth } from '../state/auth'

declare global {
  interface Window {
    google?: any
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(s)
  })
}

export async function getYouTubeToken(clientId: string, scopes: string[]) {
  await loadGIS()
  return new Promise<void>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: (resp: any) => {
        if (resp.error) return reject(resp)
        setGoogleAuth({
          access_token: resp.access_token,
          expires_in: resp.expires_in,
          scope: resp.scope,
          token_type: 'Bearer',
          obtained_at: Math.floor(Date.now() / 1000),
        })
        resolve()
      },
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube',
]
