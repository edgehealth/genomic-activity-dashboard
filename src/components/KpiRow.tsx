import type { NationalSummary } from '../types'

const fmt = (v: number) => Math.round(v).toLocaleString('en-GB')

interface Kpi {
  label: string
  value: string
  unit?: string
  foot: string
  accent?: boolean
}

export default function KpiRow({ national }: { national: NationalSummary }) {
  const kpis: Kpi[] = [
    {
      label: 'Total genomic tests, 12 months',
      value: fmt(national.totalActivity),
      foot: `across ${national.hubCount} Genomic Laboratory Hubs`,
    },
    {
      label: 'Cancer genomic tests, 12 months',
      value: fmt(national.cancerActivity),
      foot: 'national total',
    },
    {
      label: 'Rare & inherited disease, 12 months',
      value: fmt(national.rareActivity),
      foot: 'national total',
    },
    {
      label: 'Genomic tests per 1,000 population',
      value: national.per1k.toFixed(1),
      foot: 'England population-weighted mean',
      accent: true,
    },
  ]

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
