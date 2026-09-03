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
import GeneMapPanel from './components/GeneMapPanel'
import TabBar, { type TabKey } from './components/TabBar'
import { DetailPanelSkeleton, KpiRowSkeleton, MapPanelSkeleton } from './components/Skeletons'

/** Intro copy per tab — the two tabs are different datasets, so each says what
 *  it is rather than sharing one heading. */
const INTRO: Record<TabKey, { title: string; sub: string }> = {
  glh: {
    title: 'Regional variation in genomic testing',
    sub:
      'Genomic testing activity across the 7 NHS Genomic Laboratory Hubs, benchmarked ' +
      'against the England average. Select a region to see its detailed breakdown.',
  },
  genes: {
    title: 'Gene-level testing',
    sub:
      'Which genes are tested, and for which cancer sites. Sourced from the NDRS ' +
      'cancer registry at ICB level — a different dataset and period from the GLH ' +
      'activity return, so the figures are not directly comparable.',
  },
}

export default function App() {
  const { data, loading, error } = useGenomics()
  const [tab, setTab] = useState<TabKey>('glh')
  const [metric, setMetric] = useState<MetricKey>('total')
  const [subCategory, setSubCategory] = useState<string | null>(null)
  const [basis, setBasis] = useState<Basis>('count')
  const [selectedId, setSelectedId] = useState<string>('ney')
  const [selectedIcb, setSelectedIcb] = useState<string | null>(null)
  /** Gene tab's ICB selection, shared by its map and its table. '' = England. */
  const [geneIcb, setGeneIcb] = useState<string>('')

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

  const intro = INTRO[tab]
  // The hub sidebar belongs to the GLH tab only: gene data is ICB-level and
  // England-wide, so a hub panel beside it would imply a filter that isn't real.
  const showSidebar = tab === 'glh'

  return (
    <div className="app">
      <Header />

      <div className={`layout${showSidebar ? '' : ' layout--full'}`}>
        <main className="main">
          <div className="intro">
            <h1 className="intro__title">{intro.title}</h1>
            <p className="intro__sub">{intro.sub}</p>
          </div>

          <TabBar active={tab} onSelect={setTab} />

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

          {data && tab === 'glh' && (
            <div id="panel-glh" role="tabpanel" aria-labelledby="tab-glh" className="tabpanel">
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
            </div>
          )}

          {data && tab === 'genes' && (
            <div id="panel-genes" role="tabpanel" aria-labelledby="tab-genes" className="tabpanel">
              <GeneMapPanel
                genes={data.genes}
                hubs={data.hubs}
                selectedIcb={geneIcb || null}
                // Clicking the selected ICB again clears back to England.
                onSelectIcb={(code) => setGeneIcb((prev) => (prev === code ? '' : code))}
              />
              <GenePanel genes={data.genes} icbCode={geneIcb} onSelectIcb={setGeneIcb} />
            </div>
          )}
        </main>

        {loading && <DetailPanelSkeleton />}

        {data && showSidebar && (
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
