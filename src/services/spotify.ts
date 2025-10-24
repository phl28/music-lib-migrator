import { spotifyTokens } from '../state/auth'

const API = 'https://api.spotify.com/v1'

async function authedFetch(url: string) {
  const t = spotifyTokens()
  if (!t) throw new Error('Not authenticated with Spotify')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${t.access_token}` } })
  if (res.status === 429) {
    const ra = parseInt(res.headers.get('Retry-After') || '1', 10)
    await new Promise(r => setTimeout(r, (ra + 1) * 1000))
    return authedFetch(url)
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
