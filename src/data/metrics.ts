import type { Hub, MetricDef, MetricKey } from '../types'

// ---------------------------------------------------------------------------
// Metric definitions — drive the map/ranking toggle and all formatting.
// All four are activity measures from vw_genomics_metrics; there is no
// turnaround-time data in the source, so those metrics were removed.
// ---------------------------------------------------------------------------

const intFmt = (v: number) => Math.round(v).toLocaleString('en-GB')

export const METRICS: Record<MetricKey, MetricDef> = {
  total: {
    key: 'total',
    label: 'Total',
    longLabel: 'Total activity (12m)',
    lowerIsBetter: false,
    format: intFmt,
    trend: {
      title: '12-month activity trend',
      subtitle: 'Total genomic activity over time, this hub vs England.',
      axisLabel: 'Tests per month',
      unit: 'tests',
    },
  },
  cancer: {
    key: 'cancer',
    label: 'Cancer',
    longLabel: 'Cancer activity (12m)',
    lowerIsBetter: false,
    format: intFmt,
    trend: {
      title: '12-month cancer activity trend',
      subtitle: 'Cancer genomic activity over time, this hub vs England.',
      axisLabel: 'Cancer tests per month',
      unit: 'tests',
    },
  },
  rare: {
    key: 'rare',
    label: 'Rare disease',
    longLabel: 'Rare disease activity (12m)',
    lowerIsBetter: false,
    format: intFmt,
    trend: {
      title: '12-month rare disease activity trend',
      subtitle: 'Rare & inherited disease activity over time, this hub vs England.',
      axisLabel: 'Rare disease tests per month',
      unit: 'tests',
    },
  },
  per1k: {
    key: 'per1k',
    label: 'Per 1,000',
    longLabel: 'Activity per 1,000 population',
    lowerIsBetter: false,
    format: (v) => v.toFixed(1),
    trend: {
      title: '12-month activity per 1,000 trend',
      subtitle: 'Monthly activity per 1,000 population, this hub vs England.',
      axisLabel: 'Tests per 1,000 per month',
      unit: 'per 1,000',
    },
  },
}

export const METRIC_ORDER: MetricKey[] = ['total', 'cancer', 'rare', 'per1k']

/** Pull the raw value for a given metric off a hub. */
export function metricValue(hub: Hub, key: MetricKey): number {
  switch (key) {
    case 'total': return hub.totalActivity
    case 'cancer': return hub.cancerActivity
    case 'rare': return hub.rareActivity
    case 'per1k': return hub.per1k
  }
}
