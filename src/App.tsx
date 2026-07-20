import { useState } from 'react'
import './App.css'
import type { MetricKey } from './types'
import { icbByCode } from './data/icbToGlh'
import { useGenomics } from './hooks/useGenomics'
import Header from './components/Header'
import KpiRow from './components/KpiRow'
import MapPanel from './components/MapPanel'
import DetailPanel from './components/DetailPanel'

export default function App() {
  const { data, loading, error } = useGenomics()
  const [metric, setMetric] = useState<MetricKey>('per1k')
  const [selectedId, setSelectedId] = useState<string>('ney')
  const [selectedIcb, setSelectedIcb] = useState<string | null>(null)

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

          {loading && <div className="state state--loading">Loading genomics activity…</div>}
          {error && (
            <div className="state state--error">
              Couldn’t load data: {error}
            </div>
          )}

          {data && (
            <>
              <KpiRow national={data.national} />
              <MapPanel
                hubs={data.hubs}
                metric={metric}
                selectedId={selectedId}
                selectedIcb={selectedIcb}
                onSelectMetric={setMetric}
                onSelectHub={handleSelectHub}
                onSelectIcb={handleSelectIcb}
              />
            </>
          )}
        </main>

        {data && (
          <DetailPanel
            hub={data.hubs.find((h) => h.id === selectedId) ?? data.hubs[0]}
            national={data.national}
            icb={selectedIcb ? icbByCode[selectedIcb] : undefined}
          />
        )}
      </div>
    </div>
  )
}
