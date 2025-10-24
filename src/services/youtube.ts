import { googleAuth } from '../state/auth'

const API = 'https://www.googleapis.com/youtube/v3'

async function authed(url: string) {
  const t = googleAuth()
  if (!t) throw new Error('Not authenticated with Google')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${t.access_token}` } })
  return res
}

export async function listMyPlaylists() {
  let url = `${API}/playlists?part=id,snippet&mine=true&maxResults=50`
  const items: any[] = []
  while (url) {
    const res = await authed(url)
    if (!res.ok) throw new Error('YouTube playlists fetch failed')
    const json = await res.json()
    items.push(...json.items)
    url = json.nextPageToken ? `${API}/playlists?part=id,snippet&mine=true&maxResults=50&pageToken=${json.nextPageToken}` : ''
  }
  return items
}
