import { A } from '@solidjs/router'
import { For, Show, Switch, Match, createMemo, createResource, createSignal } from 'solid-js'
import { spotifyAccessTokenValid, googleAccessTokenValid } from '../state/auth'
import * as sp from '../services/spotify'
import * as yt from '../services/youtube'
import { normalizeSpotifyItem, normalizeYouTubeItem, matchSpotifyToYouTube, matchYouTubeToSpotify } from '../services/match'
import { migrateToSpotify, migrateToYouTube } from '../services/migrate'

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
  const [step, setStep] = createSignal<'select'|'dryrun'|'migrate'>('select')
  const [dryrun, setDryrun] = createSignal<any>(null)
  const [busy, setBusy] = createSignal(false)
  const [statusText, setStatusText] = createSignal('')
  const [cancelled, setCancelled] = createSignal(false)
  const [processed, setProcessed] = createSignal<{ done: number; total: number }>({ done: 0, total: 0 })
  // Migration options
  const [mode, setMode] = createSignal<'create'|'mergeByName'>('create')
  const [allowCreateIfMissing, setAllowCreateIfMissing] = createSignal(true)
  const [dedupeInput, setDedupeInput] = createSignal(true)
  const [dedupeExisting, setDedupeExisting] = createSignal(true)
  
  async function runDryRun() {
    setBusy(true)
    setCancelled(false)
    try {
      const sel = new Set(Object.entries(selectedIds()).filter(([, v]) => v).map(([k]) => k))
      const src = (playlists() || []).filter((p: any) => sel.has(p.id))
      const total = src.reduce((sum: number, p: any) => sum + (direction() === 'sp2yt' ? (p.tracks?.total || 0) : (p.contentDetails?.itemCount || 0)), 0)
      setProcessed({ done: 0, total })
      const groups: any[] = []
      for (let pi = 0; pi < src.length; pi++) {
        const p = src[pi]
        const pTitle = p.name || p.snippet?.title || '(untitled)'
        setStatusText(`Analyzing "${pTitle}" (${pi + 1}/${src.length})…`)
        if (direction() === 'sp2yt') {
          const tracks = await sp.listPlaylistTracks(p.id)
          const norm = tracks.map(normalizeSpotifyItem).filter(Boolean) as any[]
          const items: any[] = []
          for (let ti = 0; ti < norm.length; ti++) {
            const t = norm[ti]
            if (cancelled()) break
            const m = await matchSpotifyToYouTube(t)
            items.push({ sourceId: t.spotifyId, destId: m.videoId, title: t.title, method: m.method })
            if (ti % 10 === 0) setStatusText(`Analyzing "${pTitle}" • ${ti + 1}/${norm.length}`)
            setProcessed(pv => ({ done: pv.done + 1, total: pv.total }))
            await sleep(120)
          }
          const matched = items.filter(i => !!i.destId).length
          groups.push({ playlistId: p.id, playlistTitle: p.name, total: items.length, matched, items })
          if (cancelled()) break
        } else if (direction() === 'yt2sp') {
          const vids = await yt.listPlaylistItems(p.id)
          const norm = vids.map(normalizeYouTubeItem).filter(Boolean) as any[]
          const items: any[] = []
          for (let ti = 0; ti < norm.length; ti++) {
            const t = norm[ti]
            if (cancelled()) break
            const m = await matchYouTubeToSpotify(t)
            items.push({ sourceId: t.youtubeVideoId, destId: m.spotifyUri, title: t.title, method: m.method })
            if (ti % 10 === 0) setStatusText(`Analyzing "${pTitle}" • ${ti + 1}/${norm.length}`)
            setProcessed(pv => ({ done: pv.done + 1, total: pv.total }))
            await sleep(100)
          }
          const matched = items.filter(i => !!i.destId).length
          const title = p.snippet?.title || '(untitled)'
          groups.push({ playlistId: p.id, playlistTitle: title, total: items.length, matched, items })
          if (cancelled()) break
        }
      }
      setDryrun(groups)
      setStep('dryrun')
    } catch (e) {
      alert('Dry‑run failed')
    } finally {
      setStatusText(cancelled() ? 'Cancelled' : '')
      setBusy(false)
    }
  }

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

        <Switch>
          <Match when={step() === 'select'}>
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
                <div style={{ 'margin-top': '1rem' }}>
                  <button disabled={selectedCount() === 0 || busy()} onClick={runDryRun}>Next: Dry‑run →</button>
                </div>
              </Show>
            </Show>
          </Match>
          <Match when={step() === 'dryrun'}>
            <DryRunView
              direction={direction()}
              result={dryrun()}
              onBack={() => setStep('select')}
              onProceed={() => setStep('migrate')}
              mode={mode}
              setMode={setMode}
              allowCreateIfMissing={allowCreateIfMissing}
              setAllowCreateIfMissing={setAllowCreateIfMissing}
              dedupeInput={dedupeInput}
              setDedupeInput={setDedupeInput}
              dedupeExisting={dedupeExisting}
              setDedupeExisting={setDedupeExisting}
            />
          </Match>
          <Match when={step() === 'migrate'}>
            <MigrateView
              direction={direction()}
              result={dryrun()}
              onBack={() => setStep('dryrun')}
              options={{
                mode: mode(),
                allowCreateIfMissing: allowCreateIfMissing(),
                dedupeInput: dedupeInput(),
                dedupeExisting: dedupeExisting(),
              }}
            />
          </Match>
        </Switch>
      </Show>
      <Show when={busy() || statusText()}>
        <div style={{ position: 'fixed', right: '1rem', bottom: '1rem', padding: '0.65rem 0.75rem', background: 'white', border: '1px solid #ddd', 'border-radius': '6px', 'box-shadow': '0 2px 8px rgba(0,0,0,0.08)', color: '#333', display: 'grid', gap: '0.4rem', 'min-width': '240px' }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'justify-content': 'space-between' }}>
            <span>{statusText() || 'Working…'}</span>
            <Show when={busy() && !cancelled()}>
              <button onClick={() => setCancelled(true)} style={{ padding: '0.25rem 0.5rem' }}>Cancel</button>
            </Show>
          </div>
          <Show when={processed().total > 0}>
            <>
              <div style={{ width: '100%', height: '8px', background: '#eee', 'border-radius': '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#3b82f6', width: `${Math.min(100, Math.floor((processed().done / Math.max(1, processed().total)) * 100))}%`, transition: 'width 0.2s ease' }} />
              </div>
              <div style={{ color: '#666', 'font-size': '0.85em' }}>{processed().done}/{processed().total}</div>
            </>
          </Show>
        </div>
      </Show>
    </div>
  )
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function DryRunView(props: {
  direction: 'sp2yt' | 'yt2sp' | ''
  result: any
  onBack: () => void
  onProceed: () => void
  mode: () => 'create'|'mergeByName'
  setMode: (m: 'create'|'mergeByName') => void
  allowCreateIfMissing: () => boolean
  setAllowCreateIfMissing: (v: boolean) => void
  dedupeInput: () => boolean
  setDedupeInput: (v: boolean) => void
  dedupeExisting: () => boolean
  setDedupeExisting: (v: boolean) => void
}) {
  if (!props.result) return <div>Preparing dry‑run…</div>
  const per = props.result as any[]
  const totals = per.reduce((acc: any, r: any) => { acc.total += r.total; acc.matched += r.matched; return acc }, { total: 0, matched: 0 })
  return (
    <div style={{ 'margin-top': '1rem' }}>
      <h4>Dry‑run results</h4>
      <div>Matched {totals.matched} / {totals.total}</div>
      <div style={{ 'margin-top': '0.5rem', border: '1px solid #ddd', padding: '0.5rem', 'border-radius': '6px' }}>
        <div style={{ 'font-weight': 600, 'margin-bottom': '0.25rem' }}>Destination</div>
        <label style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35rem', 'margin-right': '1rem' }}>
          <input type="radio" name="destMode" checked={props.mode() === 'create'} onChange={() => props.setMode('create')} />
          Create new playlist(s)
        </label>
        <label style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35rem' }}>
          <input type="radio" name="destMode" checked={props.mode() === 'mergeByName'} onChange={() => props.setMode('mergeByName')} />
          Merge into existing by exact title
        </label>
        <div style={{ 'margin-top': '0.35rem' }}>
          <label style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35rem' }}>
            <input type="checkbox" checked={props.allowCreateIfMissing()} onChange={e => props.setAllowCreateIfMissing(e.currentTarget.checked)} />
            Allow create if missing (when merging by name)
          </label>
        </div>
        <div style={{ 'margin-top': '0.5rem', 'font-weight': 600 }}>Options</div>
        <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '1rem', 'margin-top': '0.25rem' }}>
          <label style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35rem' }}>
            <input type="checkbox" checked={props.dedupeInput()} onChange={e => props.setDedupeInput(e.currentTarget.checked)} />
            Skip duplicates in this migration
          </label>
          <label style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35rem' }}>
            <input type="checkbox" checked={props.dedupeExisting()} onChange={e => props.setDedupeExisting(e.currentTarget.checked)} />
            Skip items already in destination
          </label>
        </div>
      </div>
      <div style={{ 'margin-top': '0.5rem' }}>
        <For each={per}>
          {(r: any) => (
            <div style={{ border: '1px solid #ccc', padding: '0.5rem', 'border-radius': '6px', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-weight': 600 }}>{r.playlistTitle} — {r.matched}/{r.total} matched</div>
              <details style={{ 'margin-top': '0.5rem' }}>
                <summary>Show details</summary>
                <table style={{ width: '100%', 'margin-top': '0.5rem', 'border-collapse': 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ 'text-align': 'left', 'border-bottom': '1px solid #eee', padding: '4px' }}>Source</th>
                      <th style={{ 'text-align': 'left', 'border-bottom': '1px solid #eee', padding: '4px' }}></th>
                      <th style={{ 'text-align': 'left', 'border-bottom': '1px solid #eee', padding: '4px' }}>Matched</th>
                      <th style={{ 'text-align': 'left', 'border-bottom': '1px solid #eee', padding: '4px' }}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={r.items}>
                      {(it: any) => {
                        const srcIsYT = props.direction === 'yt2sp'
                        const srcHref = srcIsYT ? `https://www.youtube.com/watch?v=${it.sourceId}` : `https://open.spotify.com/track/${it.sourceId}`
                        const destHref = props.direction === 'sp2yt'
                          ? (it.destId ? `https://www.youtube.com/watch?v=${it.destId}` : '')
                          : (it.destId ? `https://open.spotify.com/track/${(it.destId as string).split(':').pop()}` : '')
                        return (
                          <tr>
                            <td style={{ padding: '4px' }}>
                              <a href={srcHref} target="_blank" rel="noreferrer">{it.title}</a>
                            </td>
                            <td style={{ padding: '4px' }}>→</td>
                            <td style={{ padding: '4px', color: it.destId ? '#222' : 'crimson' }}>
                              {it.destId ? <a href={destHref} target="_blank" rel="noreferrer">{it.destId}</a> : 'No match'}
                            </td>
                            <td style={{ padding: '4px' }}>{it.method}</td>
                          </tr>
                        )
                      }}
                    </For>
                  </tbody>
                </table>
              </details>
            </div>
          )}
        </For>
      </div>
      <div style={{ 'margin-top': '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={props.onBack}>← Back</button>
        <button onClick={props.onProceed} disabled={totals.matched === 0}>Start migration →</button>
      </div>
    </div>
  )
}

function MigrateView(props: { direction: 'sp2yt' | 'yt2sp' | ''; result: any; onBack: () => void; options: any }) {
  const [progress, setProgress] = createSignal({ current: 0, total: 0 })
  const [message, setMessage] = createSignal('')
  const [done, setDone] = createSignal(false)
  ;(async () => {
    if (done()) return
    const groups = props.result as any[]
    setProgress({ current: 0, total: groups.length })
    for (const g of groups) {
      setMessage(`Migrating: ${g.playlistTitle}`)
      if (props.direction === 'sp2yt') {
        await migrateToYouTube(
          g.playlistTitle,
          '',
          g.items.filter((i: any) => i.destId).map((i: any) => i.destId),
          {
            mode: props.options.mode,
            allowCreateIfMissing: props.options.allowCreateIfMissing,
            dedupeInput: props.options.dedupeInput,
            dedupeExisting: props.options.dedupeExisting,
          }
        )
      } else if (props.direction === 'yt2sp') {
        await migrateToSpotify(
          g.playlistTitle,
          '',
          g.items.filter((i: any) => i.destId).map((i: any) => i.destId),
          {
            mode: props.options.mode,
            allowCreateIfMissing: props.options.allowCreateIfMissing,
            dedupeInput: props.options.dedupeInput,
            dedupeExisting: props.options.dedupeExisting,
          }
        )
      }
      setProgress(p => ({ current: p.current + 1, total: p.total }))
      await sleep(200)
    }
    setMessage('Done')
    setDone(true)
  })()
  return (
    <div style={{ 'margin-top': '1rem' }}>
      <h4>Migration</h4>
      <div>{message()}</div>
      <div style={{ 'margin-top': '0.25rem' }}>
        <div style={{ width: '100%', height: '10px', background: '#eee', 'border-radius': '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#22c55e', width: `${Math.min(100, Math.floor((progress().current / Math.max(1, progress().total)) * 100))}%`, transition: 'width 0.2s ease' }} />
        </div>
        <div style={{ color: '#666', 'font-size': '0.9em', 'margin-top': '0.25rem' }}>{progress().current} / {progress().total}</div>
      </div>
      <div style={{ 'margin-top': '0.5rem' }}>
        <button onClick={props.onBack} disabled={!done()}>← Back</button>
      </div>
    </div>
  )
}
