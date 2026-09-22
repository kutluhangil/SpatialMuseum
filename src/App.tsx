import { Route, Switch } from 'wouter'
import { MuseumView } from './routes/MuseumView'
import { SpikeView } from './routes/SpikeView'

export function App() {
  return (
    <Switch>
      <Route path="/spike" component={SpikeView} />
      <Route path="/" component={MuseumView} />
      <Route>
        <main className="grid h-full place-items-center p-4 text-lg">Sayfa bulunamadı.</main>
      </Route>
    </Switch>
  )
}
