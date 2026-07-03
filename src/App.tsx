import { useState } from 'react'
import './App.css'
import type { MetricKey } from './types'
import { hubs } from './data/hubs'
import Header from './components/Header'
import KpiRow from './components/KpiRow'
import MapPanel from './components/MapPanel'
import DetailPanel from './components/DetailPanel'

export default function App() {
  const [metric, setMetric] = useState<MetricKey>('per100k')
  const [selectedId, setSelectedId] = useState<string>('ney')

  const selectedHub = hubs.find((h) => h.id === selectedId) ?? hubs[0]

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
            onSelectMetric={setMetric}
            onSelectHub={setSelectedId}
          />
        </main>

        <DetailPanel hub={selectedHub} />
      </div>
    </div>
  )
}
