import { A } from '@solidjs/router'
import './App.css'

export default function App(props: any) {
  return (
    <div>
      <header style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <h2>Spotify ↔ YouTube Music Migrator</h2>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <A href="/">Setup</A>
          <A href="/connect">Connect</A>
          <A href="/pick">Pick</A>
        </nav>
      </header>
      {props.children}
    </div>
  )
}
