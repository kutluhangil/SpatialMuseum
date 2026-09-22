import { useEffect } from 'react'
import { Route, Switch } from 'wouter'
import { useLocaleStore } from './i18n/localeStore'
import { MuseumView } from './routes/MuseumView'
import { SpikeView } from './routes/SpikeView'

export function App() {
  const locale = useLocaleStore((s) => s.locale)
  // Screen readers and hyphenation follow <html lang>, so it has to track the chosen language.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
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
