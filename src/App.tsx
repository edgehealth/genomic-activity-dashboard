import { useState } from 'react'
import './App.css'
import type { Basis, MetricKey, MetricView } from './types'
import { icbByCode } from './data/icbToGlh'
import { useGenomics } from './hooks/useGenomics'
import Header from './components/Header'
import KpiRow from './components/KpiRow'
import MapPanel from './components/MapPanel'
import DetailPanel from './components/DetailPanel'
import GenePanel from './components/GenePanel'
import { DetailPanelSkeleton, KpiRowSkeleton, MapPanelSkeleton } from './components/Skeletons'

export default function App() {
  const { data, loading, error } = useGenomics()
  const [metric, setMetric] = useState<MetricKey>('total')
  const [subCategory, setSubCategory] = useState<string | null>(null)
  const [basis, setBasis] = useState<Basis>('count')
  const [selectedId, setSelectedId] = useState<string>('ney')
  const [selectedIcb, setSelectedIcb] = useState<string | null>(null)

  const view: MetricView = { metric, subCategory, basis }

  /** Sub-category keys belong to one metric's breakdown, so switching clears it. */
  const handleSelectMetric = (m: MetricKey) => {
    setMetric(m)
    setSubCategory(null)
  }

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
              Genomic testing activity across the 7 NHS Genomic Laboratory Hubs, benchmarked against the
              England average. Select a region to see its detailed breakdown.
            </p>
          </div>

          {/* Screen readers get a status message; the skeletons themselves are
              aria-hidden, since shimmer blocks say nothing useful aloud. */}
          <p className="visually-hidden" role="status" aria-live="polite">
            {loading
              ? 'Loading genomic testing activity.'
              : error
                ? `Could not load data: ${error}`
                : 'Genomic testing activity loaded.'}
          </p>

          {error && (
            <div className="state state--error">
              Couldn’t load data: {error}
            </div>
          )}

          {loading && (
            <>
              <KpiRowSkeleton />
              <MapPanelSkeleton />
            </>
          )}

          {data && (
            <>
              <KpiRow national={data.national} />
              <MapPanel
                hubs={data.hubs}
                view={view}
                national={data.national}
                selectedId={selectedId}
                selectedIcb={selectedIcb}
                onSelectMetric={handleSelectMetric}
                onSelectSubCategory={setSubCategory}
                onSelectBasis={setBasis}
                onSelectHub={handleSelectHub}
                onSelectIcb={handleSelectIcb}
              />
              <GenePanel
                genes={data.genes}
                selectedHubName={
                  data.hubs.find((h) => h.id === selectedId)?.name ?? 'no hub selected'
                }
              />
            </>
          )}
        </main>

        {loading && <DetailPanelSkeleton />}

        {data && (
          <DetailPanel
            hub={data.hubs.find((h) => h.id === selectedId) ?? data.hubs[0]}
            national={data.national}
            view={view}
            icb={selectedIcb ? icbByCode[selectedIcb] : undefined}
          />
        )}
      </div>
    </div>
  )
}
