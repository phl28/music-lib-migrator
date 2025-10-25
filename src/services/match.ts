import * as sp from './spotify'
import * as yt from './youtube'

export type NormalizedTrack = {
  title: string
  artists: string[]
  durationMs?: number
  isrc?: string
  spotifyId?: string
  youtubeVideoId?: string
}

function normTitle(s: string) { return s?.trim() || '' }

export function normalizeSpotifyItem(item: any): NormalizedTrack | null {
  const t = item?.track
  if (!t) return null
  return {
    title: normTitle(t.name),
    artists: (t.artists || []).map((a: any) => a.name),
    durationMs: t.duration_ms,
    isrc: t.external_ids?.isrc,
    spotifyId: t.id,
  }
}

export function normalizeYouTubeItem(item: any): NormalizedTrack | null {
  const s = item?.snippet
  if (!s) return null
  const title = normTitle(s.title)
  const artists: string[] = []
  const parts = title.split(' - ')
  if (parts.length >= 2) artists.push(parts[0])
  return {
    title,
    artists,
    youtubeVideoId: item?.contentDetails?.videoId || s?.resourceId?.videoId,
  }
}

export async function matchSpotifyToYouTube(t: NormalizedTrack) {
  if (t.isrc) {
    const hits = await yt.searchByISRC(t.isrc)
    const v = hits?.[0]
    if (v) return { videoId: v.id.videoId as string, method: 'isrc' }
  }
  const q = `${t.artists?.[0] || ''} ${t.title}`.trim()
  const hits = await yt.searchByQuery(q)
  const v = hits?.[0]
  if (v) return { videoId: v.id.videoId as string, method: 'query' }
  return { videoId: null as any, method: 'none' }
}

export async function matchYouTubeToSpotify(t: NormalizedTrack) {
  const baseQ = `${t.title}`
  let hit = await sp.searchTrackByQuery(baseQ)
  if (!hit && t.artists?.length) hit = await sp.searchTrackByQuery(`${t.artists[0]} ${t.title}`)
  if (hit) return { spotifyUri: `spotify:track:${hit.id}`, method: 'query' }
  return { spotifyUri: null as any, method: 'none' }
}
