import { googleAuth } from '../state/auth'

const API = 'https://www.googleapis.com/youtube/v3'

async function authed(url: string, init?: RequestInit): Promise<Response> {
  const t = googleAuth()
  if (!t) throw new Error('Not authenticated with Google')
  const res = await fetch(url, { ...(init || {}), headers: { ...(init?.headers || {}), Authorization: `Bearer ${t.access_token}` } })
  return res
}

export async function listMyPlaylists() {
  let url = `${API}/playlists?part=id,snippet,contentDetails&mine=true&maxResults=50`
  const items: any[] = []
  while (url) {
    const res = await authed(url)
    if (!res.ok) throw new Error('YouTube playlists fetch failed')
    const json = await res.json()
    items.push(...json.items)
    url = json.nextPageToken ? `${API}/playlists?part=id,snippet,contentDetails&mine=true&maxResults=50&pageToken=${json.nextPageToken}` : ''
  }
  return items
}

export async function listPlaylistItems(playlistId: string) {
  let url = `${API}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(playlistId)}`
  const items: any[] = []
  while (url) {
    const res = await authed(url)
    if (!res.ok) throw new Error('YouTube playlist items fetch failed')
    const json = await res.json()
    items.push(...json.items)
    url = json.nextPageToken ? `${API}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&pageToken=${json.nextPageToken}` : ''
  }
  return items
}

export async function searchByISRC(isrc: string) {
  const url = `${API}/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(isrc)}`
  const res = await authed(url)
  if (!res.ok) return []
  const json = await res.json()
  return json.items || []
}

export async function searchByQuery(q: string) {
  const url = `${API}/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q)}`
  const res = await authed(url)
  if (!res.ok) return []
  const json = await res.json()
  return json.items || []
}

export async function createPlaylist(title: string, description = '', privacyStatus: 'private' | 'public' | 'unlisted' = 'unlisted') {
  const res = await authed(`${API}/playlists?part=snippet,status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: { title, description },
      status: { privacyStatus },
    }),
  })
  if (!res.ok) throw new Error('YouTube create playlist failed')
  return res.json()
}

export async function insertPlaylistItems(playlistId: string, videoIds: string[]) {
  for (const id of videoIds) {
    const res = await authed(`${API}/playlistItems?part=snippet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: { kind: 'youtube#video', videoId: id },
        },
      }),
    })
    if (res.status === 403 || res.status === 429) await new Promise(r => setTimeout(r, 1200))
    if (!res.ok) throw new Error('YouTube insert item failed')
  }
}

export async function findPlaylistByTitle(title: string) {
  const all = await listMyPlaylists()
  const target = title.trim().toLowerCase()
  return all.find((p: any) => (p.snippet?.title || '').trim().toLowerCase() === target) || null
}

export async function listPlaylistVideoIds(playlistId: string) {
  const items = await listPlaylistItems(playlistId)
  const ids = items.map((it: any) => it.contentDetails?.videoId).filter(Boolean)
  return ids as string[]
}
