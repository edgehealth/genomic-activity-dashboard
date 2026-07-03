import { national } from '../data/hubs'

interface Kpi {
  label: string
  value: string
  unit?: string
  foot: string
  accent?: boolean
}

const kpis: Kpi[] = [
  {
    label: 'Total tests, 12 months',
    value: '487',
    unit: 'k',
    foot: `across ${national.hubCount} Genomic Laboratory Hubs`,
  },
  {
    label: 'Tests per 100k',
    value: national.testsPer100k.toLocaleString('en-GB'),
    foot: 'England population-weighted mean',
  },
  {
    label: 'Median TAT',
    value: national.medianTat.toFixed(1),
    unit: 'd',
    foot: `${national.tatPct}% within standard`,
  },
  {
    label: 'Year-on-year growth',
    value: `+${national.yoyGrowth}`,
    unit: '%',
    foot: 'test volume vs prior 12m',
    accent: true,
  },
]

export default function KpiRow() {
  return (
    <div className="kpirow">
      {kpis.map((k) => (
        <div className="kpi" key={k.label}>
          <div className="eyebrow">{k.label}</div>
          <div className={`kpi__value tnum${k.accent ? ' kpi__value--accent' : ''}`}>
            {k.value}
            {k.unit && <span className="kpi__unit">{k.unit}</span>}
          </div>
          <div className="kpi__foot">{k.foot}</div>
        </div>
      ))}
    </div>
  )
}
