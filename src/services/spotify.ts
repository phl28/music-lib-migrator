import { spotifyTokens } from '../state/auth'
import { refreshSpotifyToken } from '../auth/spotifyAuth'
import { spotifyClientId } from '../state/credentials'

const API = 'https://api.spotify.com/v1'

async function authedFetch(url: string, init?: RequestInit, retry = true): Promise<Response> {
  const t = spotifyTokens()
  if (!t) throw new Error('Not authenticated with Spotify')
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${t.access_token}` },
  })
  if (res.status === 429) {
    const ra = parseInt(res.headers.get('Retry-After') || '1', 10)
    await new Promise(r => setTimeout(r, (ra + 1) * 1000))
    return authedFetch(url, init, retry)
  }
  if (res.status === 401 && retry && t.refresh_token && spotifyClientId()) {
    try { await refreshSpotifyToken({ clientId: spotifyClientId(), refreshToken: t.refresh_token }) } catch {}
    return authedFetch(url, init, false)
  }
  return res
}

export async function listPlaylists() {
  let url = `${API}/me/playlists?limit=50`
  const items: any[] = []
  while (url) {
    const res = await authedFetch(url)
    if (!res.ok) throw new Error('Spotify playlists fetch failed')
    const json = await res.json()
    items.push(...json.items)
    url = json.next
  }
  return items
}

export async function listPlaylistTracks(playlistId: string) {
  let url = `${API}/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`
  const items: any[] = []
  while (url) {
    const res = await authedFetch(url)
    if (!res.ok) throw new Error('Spotify playlist tracks fetch failed')
    const json = await res.json()
    items.push(...json.items)
    url = json.next
  }
  return items
}

let cachedUserId: string | null = null
export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId
  const res = await authedFetch(`${API}/me`)
  if (!res.ok) throw new Error('Spotify me failed')
  const json = await res.json()
  cachedUserId = json.id
  return cachedUserId!
}

export async function createPlaylist(name: string, description = '', isPublic = false) {
  const userId = await getCurrentUserId()
  const res = await authedFetch(`${API}/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, public: isPublic })
  })
  if (!res.ok) throw new Error('Spotify create playlist failed')
  return res.json()
}

export async function addTracksToPlaylist(playlistId: string, uris: string[]) {
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100)
    const res = await authedFetch(`${API}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: chunk })
    })
    if (!res.ok) throw new Error('Spotify add tracks failed')
  }
}

export async function searchTrackByISRC(isrc: string) {
  const url = `${API}/search?type=track&limit=5&q=${encodeURIComponent('isrc:' + isrc)}`
  const res = await authedFetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json.tracks?.items?.[0] || null
}

export async function searchTrackByQuery(q: string) {
  const url = `${API}/search?type=track&limit=5&q=${encodeURIComponent(q)}`
  const res = await authedFetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json.tracks?.items?.[0] || null
}

export async function findPlaylistByName(name: string) {
  const all = await listPlaylists()
  const target = name.trim().toLowerCase()
  return all.find((p: any) => (p.name || '').trim().toLowerCase() === target) || null
}

export async function listPlaylistTrackUris(playlistId: string) {
  const items = await listPlaylistTracks(playlistId)
  const uris = items.map((it: any) => it.track?.uri).filter(Boolean)
  return uris as string[]
}
