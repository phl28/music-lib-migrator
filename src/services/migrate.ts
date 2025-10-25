import * as sp from './spotify'
import * as yt from './youtube'

export type DryRunItem = {
  sourceId: string
  destId?: string
  title: string
  method: 'isrc' | 'query' | 'none'
}

export type DryRunResult = {
  playlistId: string
  playlistTitle: string
  total: number
  matched: number
  items: DryRunItem[]
}

export async function migrateToYouTube(title: string, description: string, videoIds: string[]) {
  const pl = await yt.createPlaylist(title, description, 'unlisted')
  const destId = pl.id as string
  await yt.insertPlaylistItems(destId, videoIds.filter(Boolean))
  return destId
}

export async function migrateToSpotify(title: string, description: string, uris: string[]) {
  const pl = await sp.createPlaylist(title, description, false)
  const destId = pl.id as string
  await sp.addTracksToPlaylist(destId, uris.filter(Boolean))
  return destId
}
