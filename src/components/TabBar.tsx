export type TabKey = 'glh' | 'genes'

interface Tab {
  key: TabKey
  label: string
  /** One line under the label, saying what the tab's data actually is. */
  hint: string
}

// The two tabs are different datasets, not two cuts of one — GLH activity is
// the monthly return for the current 12 months, gene-level is NDRS registry
// data by ICB and year. The hints say so, because the figures are not
// comparable and shouldn't be read as if they were.
const TABS: Tab[] = [
  { key: 'glh', label: 'GLH activity', hint: 'Genomic Laboratory Hubs · last 12 months' },
  { key: 'genes', label: 'Gene-level testing', hint: 'ICB level · NDRS registry · 2022' },
]

interface Props {
  active: TabKey
  onSelect: (tab: TabKey) => void
}

export default function TabBar({ active, onSelect }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="Dashboard view">
      {TABS.map((t) => (
        <button
          key={t.key}
          role="tab"
          id={`tab-${t.key}`}
          aria-selected={t.key === active}
          aria-controls={`panel-${t.key}`}
          className={`tab${t.key === active ? ' tab--on' : ''}`}
          onClick={() => onSelect(t.key)}
        >
          <span className="tab__label">{t.label}</span>
          <span className="tab__hint">{t.hint}</span>
        </button>
      ))}
    </div>
  )
}
