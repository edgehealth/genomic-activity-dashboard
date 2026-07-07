import { useState } from 'react'
import './App.css'
import type { MetricKey } from './types'
import { hubs } from './data/hubs'
import { icbByCode } from './data/icbToGlh'
import Header from './components/Header'
import KpiRow from './components/KpiRow'
import MapPanel from './components/MapPanel'
import DetailPanel from './components/DetailPanel'

export default function App() {
  const [metric, setMetric] = useState<MetricKey>('per100k')
  const [selectedId, setSelectedId] = useState<string>('ney')
  const [selectedIcb, setSelectedIcb] = useState<string | null>(null)

  const selectedHub = hubs.find((h) => h.id === selectedId) ?? hubs[0]

  /** Map click: select the ICB and jump the dashboard to its parent GLH. */
  const handleSelectIcb = (icbCode: string, glhId: string) => {
    setSelectedIcb(icbCode)
    setSelectedId(glhId)
  }

  /** Ranked-list click: hub-level selection, so clear any ICB highlight. */
  const handleSelectHub = (id: string) => {
    setSelectedId(id)
    setSelectedIcb(null)
  }

  return (
    <div className="app">
      <Header />

      <div className="layout">
        <main className="main">
          <div className="intro">
            <h1 className="intro__title">Regional variation in genomic testing</h1>
            <p className="intro__sub">
              Activity across the 7 NHS Genomic Laboratory Hubs, benchmarked against the
              England average. Select a region to see its detailed breakdown.
            </p>
          </div>

          <KpiRow />

          <MapPanel
            hubs={hubs}
            metric={metric}
            selectedId={selectedId}
            selectedIcb={selectedIcb}
            onSelectMetric={setMetric}
            onSelectHub={handleSelectHub}
            onSelectIcb={handleSelectIcb}
          />
        </main>

        <DetailPanel hub={selectedHub} icb={selectedIcb ? icbByCode[selectedIcb] : undefined} />
      </div>
    </div>
  )
}
