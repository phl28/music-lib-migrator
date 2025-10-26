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

export type MigrateOptions = {
  mode?: 'create' | 'mergeByName' | 'mergeIntoId'
  allowCreateIfMissing?: boolean
  dedupeInput?: boolean
  dedupeExisting?: boolean
  privacyStatus?: 'private' | 'public' | 'unlisted'
  existingPlaylistId?: string
}

export async function migrateToYouTube(title: string, description: string, videoIds: string[], opts: MigrateOptions = {}) {
  const mode = opts.mode || 'create'
  const allowCreateIfMissing = opts.allowCreateIfMissing ?? true
  const privacy = opts.privacyStatus || 'unlisted'

  let ids = videoIds.filter(Boolean)
  if (opts.dedupeInput) {
    const seen = new Set<string>()
    ids = ids.filter(id => (seen.has(id) ? false : (seen.add(id), true)))
  }

  let destId: string | null = null
  if (mode === 'mergeIntoId' && opts.existingPlaylistId) {
    destId = opts.existingPlaylistId
  } else if (mode === 'mergeByName') {
    const found = await yt.findPlaylistByTitle(title)
    if (found) destId = found.id
    else if (allowCreateIfMissing) {
      const pl = await yt.createPlaylist(title, description, privacy)
      destId = pl.id as string
    } else {
      throw new Error(`Destination playlist "${title}" not found`)
    }
  } else {
    const pl = await yt.createPlaylist(title, description, privacy)
    destId = pl.id as string
  }

  if (!destId) throw new Error('No destination playlist id')

  let toInsert = ids
  if (opts.dedupeExisting) {
    const existing = await yt.listPlaylistVideoIds(destId)
    const existingSet = new Set(existing)
    toInsert = ids.filter(id => !existingSet.has(id))
  }

  if (toInsert.length > 0) await yt.insertPlaylistItems(destId, toInsert)
  return destId
}

export async function migrateToSpotify(title: string, description: string, uris: string[], opts: MigrateOptions = {}) {
  const mode = opts.mode || 'create'
  const allowCreateIfMissing = opts.allowCreateIfMissing ?? true

  let list = uris.filter(Boolean)
  if (opts.dedupeInput) {
    const seen = new Set<string>()
    list = list.filter(u => (seen.has(u) ? false : (seen.add(u), true)))
  }

  let destId: string | null = null
  if (mode === 'mergeIntoId' && opts.existingPlaylistId) {
    destId = opts.existingPlaylistId
  } else if (mode === 'mergeByName') {
    const found = await sp.findPlaylistByName(title)
    if (found) destId = found.id
    else if (allowCreateIfMissing) {
      const pl = await sp.createPlaylist(title, description, false)
      destId = pl.id as string
    } else {
      throw new Error(`Destination playlist "${title}" not found`)
    }
  } else {
    const pl = await sp.createPlaylist(title, description, false)
    destId = pl.id as string
  }

  if (!destId) throw new Error('No destination playlist id')

  let toAdd = list
  if (opts.dedupeExisting) {
    const existingUris = await sp.listPlaylistTrackUris(destId)
    const existingSet = new Set(existingUris)
    toAdd = list.filter(u => !existingSet.has(u))
  }

  if (toAdd.length > 0) await sp.addTracksToPlaylist(destId, toAdd)
  return destId
}
