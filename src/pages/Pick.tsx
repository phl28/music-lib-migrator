import { A } from '@solidjs/router'
import { For, Show, createMemo, createResource, createSignal } from 'solid-js'
import { spotifyAccessTokenValid, googleAccessTokenValid } from '../state/auth'
import * as sp from '../services/spotify'
import * as yt from '../services/youtube'

type Direction = 'sp2yt' | 'yt2sp' | ''

export default function Pick() {
  const hasSpotify = createMemo(spotifyAccessTokenValid)
  const hasGoogle = createMemo(googleAccessTokenValid)

  const [direction, setDirection] = createSignal<Direction>('')
  const [filter, setFilter] = createSignal('')
  const [selectedIds, setSelectedIds] = createSignal<Record<string, boolean>>({})

  const [playlists] = createResource(direction, async (dir) => {
    if (!dir) return [] as any[]
    if (dir === 'sp2yt') {
      if (!hasSpotify()) throw new Error('Connect Spotify first')
      return await sp.listPlaylists()
    } else {
      if (!hasGoogle()) throw new Error('Connect Google first')
      return await yt.listMyPlaylists()
    }
  })

  const filtered = createMemo(() => {
    const q = filter().toLowerCase().trim()
    const arr = playlists() || []
    if (!q) return arr
    return arr.filter((p: any) => (p.name || p.snippet?.title || '').toLowerCase().includes(q))
  })

  function toggleAll(check: boolean) {
    const obj: Record<string, boolean> = {}
    for (const p of filtered() as any[]) obj[p.id] = check
    setSelectedIds(obj)
  }

  function toggleOne(id: string, v: boolean) {
    setSelectedIds({ ...selectedIds(), [id]: v })
  }

  const selectedCount = createMemo(() => Object.values(selectedIds()).filter(Boolean).length)

  return (
    <div class="card" style={{ 'text-align': 'left', 'max-width': '980px', margin: '0 auto' }}>
      <h3>3) Pick direction and playlists</h3>

      <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
        <button disabled={!hasSpotify() || !hasGoogle()} onClick={() => { setDirection('sp2yt'); setSelectedIds({}) }}>
          Spotify → YouTube
        </button>
        <button disabled={!hasSpotify() || !hasGoogle()} onClick={() => { setDirection('yt2sp'); setSelectedIds({}) }}>
          YouTube → Spotify
        </button>
        <span>
          <strong>Spotify:</strong> {hasSpotify() ? 'Connected' : 'Not connected'} · <strong>Google:</strong> {hasGoogle() ? 'Connected' : 'Not connected'}
        </span>
        <A href="/connect"><button>Manage connections</button></A>
      </div>

      <Show when={direction()}>
        <div style={{ 'margin-top': '1rem' }}>
          <input
            type="text"
            placeholder="Filter playlists"
            value={filter()}
            onInput={e => setFilter(e.currentTarget.value)}
            style={{ width: '100%', padding: '0.5rem' }}
          />
          <div style={{ 'margin-top': '0.5rem', display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
            <button onClick={() => toggleAll(true)} disabled={!filtered().length}>Select all</button>
            <button onClick={() => toggleAll(false)} disabled={!filtered().length}>Clear</button>
            <span>Selected: {selectedCount()}</span>
          </div>
        </div>

        <Show when={!playlists.error} fallback={<p style={{ color: 'crimson' }}>Error: {String(playlists.error)}</p>}>
          <Show when={!playlists.loading} fallback={<p>Loading playlists…</p>}>
            <div style={{ 'margin-top': '0.5rem', display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
              <For each={filtered() as any[]}>
                {(p: any) => {
                  const id = p.id
                  const title = p.name || p.snippet?.title || '(untitled)'
                  const count = p.tracks?.total ?? p.contentDetails?.itemCount ?? ''
                  const thumb = p.images?.[0]?.url || p.snippet?.thumbnails?.default?.url
                  const checked = !!selectedIds()[id]
                  return (
                    <label style={{ border: '1px solid #ccc', padding: '0.5rem', 'border-radius': '6px', display: 'flex', gap: '0.5rem' }}>
                      <input type="checkbox" checked={checked} onChange={e => toggleOne(id, e.currentTarget.checked)} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Show when={thumb}><img src={thumb} alt="" width={48} height={48} /></Show>
                        <div>
                          <div style={{ 'font-weight': 600 }}>{title}</div>
                          <div style={{ color: '#666', 'font-size': '0.9em' }}>{count ? `${count} items` : ''}</div>
                        </div>
                      </div>
                    </label>
                  )
                }}
              </For>
            </div>
          </Show>
        </Show>

        <div style={{ 'margin-top': '1rem' }}>
          <button disabled={selectedCount() === 0} onClick={() => alert('Dry‑run coming next')}>Next: Dry‑run →</button>
        </div>
      </Show>
    </div>
  )
}
