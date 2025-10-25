/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import './index.css'
import App from './App.tsx'
import Setup from './pages/Setup'
import Connect from './pages/Connect'
import Pick from './pages/Pick'
import CallbackSpotify from './pages/CallbackSpotify'
import CallbackGoogle from './pages/CallbackGoogle'

const root = document.getElementById('root')

render(() => (
  <Router root={App} base={(import.meta as any).env.BASE_URL}>
    <Route path="/" component={Setup} />
    <Route path="/connect" component={Connect} />
    <Route path="/pick" component={Pick} />
    <Route path="/callback/spotify" component={CallbackSpotify} />
    <Route path="/callback/google" component={CallbackGoogle} />
    <Route path="/*" component={Setup} />
  </Router>
), root!)
