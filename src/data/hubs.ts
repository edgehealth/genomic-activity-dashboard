import type { Hub, NationalSummary, MetricDef, MetricKey, TrendPoint } from '../types'

// ===========================================================================
// PLACEHOLDER DATA
// ---------------------------------------------------------------------------
// Everything in this file is illustrative. To bring the dashboard to life,
// replace the values below (or, better, fetch them — see README "Wiring in
// real data"). The component tree only depends on the shapes in ../types.ts,
// so as long as a real feed produces Hub[] + NationalSummary the UI works
// unchanged.
// ===========================================================================

const MONTHS = [
  'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26',
  'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26',
]

/**
 * Deterministic 12-month trend generator (no Math.random so the chart is
 * stable across reloads). Produces a gently rising line with mild seasonality.
 */
function makeTrend(hubStart: number, hubEnd: number, natStart: number, natEnd: number): TrendPoint[] {
  return MONTHS.map((month, i) => {
    const t = i / (MONTHS.length - 1)
    const wobble = Math.sin(i * 1.1) * 12
    return {
      month,
      hub: Math.round(hubStart + (hubEnd - hubStart) * t + wobble),
      national: Math.round(natStart + (natEnd - natStart) * t + wobble * 0.4),
    }
  })
}

export const national: NationalSummary = {
  totalTests: 487_000,
  hubCount: 7,
  testsPer100k: 966,
  medianTat: 17.7,
  tatPct: 79.6,
  yoyGrowth: 12.6,
}

export const hubs: Hub[] = [
  {
    id: 'north-thames',
    name: 'North Thames',
    hubName: 'North Thames Genomic Laboratory Hub',
    provider: 'Great Ormond Street Hospital NHS FT',
    catchmentM: 10.5,
    accreditations: ['UKAS ISO 15189', 'WGS-ready'],
    totalTests: 121_400,
    testsPer100k: 1_140,
    medianTat: 15.8,
    tatPct: 84.1,
    yoyGrowth: 13.9,
    per100kYoy: 7.8,
    per100kVsNat: 18.0,
    trend: makeTrend(1010, 1140, 900, 966),
  },
  {
    id: 'east',
    name: 'East',
    hubName: 'East Genomic Laboratory Hub',
    provider: 'Cambridge University Hospitals NHS FT',
    catchmentM: 8.7,
    accreditations: ['UKAS ISO 15189', 'WGS-ready'],
    totalTests: 96_300,
    testsPer100k: 1_082,
    medianTat: 16.4,
    tatPct: 83.2,
    yoyGrowth: 11.1,
    per100kYoy: 5.9,
    per100kVsNat: 12.0,
    trend: makeTrend(970, 1082, 900, 966),
  },
  {
    id: 'ney',
    name: 'North East & Yorkshire',
    hubName: 'North East & Yorkshire Genomic Laboratory Hub',
    provider: 'Newcastle upon Tyne Hospitals NHS FT',
    catchmentM: 6.7,
    accreditations: ['UKAS ISO 15189', 'WGS-ready'],
    totalTests: 81_900,
    testsPer100k: 1_011,
    medianTat: 16.9,
    tatPct: 82.7,
    yoyGrowth: 14.2,
    per100kYoy: 6.7,
    per100kVsNat: 4.7,
    trend: makeTrend(880, 1011, 900, 966),
  },
  {
    id: 'north-west',
    name: 'North West',
    hubName: 'North West Genomic Laboratory Hub',
    provider: 'Manchester University NHS FT',
    catchmentM: 10.9,
    accreditations: ['UKAS ISO 15189', 'WGS-ready'],
    totalTests: 106_700,
    testsPer100k: 979,
    medianTat: 18.1,
    tatPct: 78.4,
    yoyGrowth: 12.0,
    per100kYoy: 4.4,
    per100kVsNat: 1.3,
    trend: makeTrend(905, 979, 900, 966),
  },
  {
    id: 'south-east',
    name: 'South East',
    hubName: 'South East Genomic Laboratory Hub',
    provider: "Guy's and St Thomas' NHS FT",
    catchmentM: 9.4,
    accreditations: ['UKAS ISO 15189', 'WGS-ready'],
    totalTests: 83_800,
    testsPer100k: 892,
    medianTat: 18.9,
    tatPct: 76.9,
    yoyGrowth: 10.4,
    per100kYoy: 3.1,
    per100kVsNat: -7.7,
    trend: makeTrend(845, 892, 900, 966),
  },
  {
    id: 'central-south',
    name: 'Central & South',
    hubName: 'Central & South Genomic Laboratory Hub',
    provider: 'Oxford University Hospitals NHS FT',
    catchmentM: 11.2,
    accreditations: ['UKAS ISO 15189', 'WGS-ready'],
    totalTests: 98_600,
    testsPer100k: 880,
    medianTat: 19.4,
    tatPct: 75.1,
    yoyGrowth: 9.8,
    per100kYoy: 2.6,
    per100kVsNat: -8.9,
    trend: makeTrend(840, 880, 900, 966),
  },
  {
    id: 'south-west',
    name: 'South West',
    hubName: 'South West Genomic Laboratory Hub',
    provider: 'North Bristol NHS Trust',
    catchmentM: 5.5,
    accreditations: ['UKAS ISO 15189', 'WGS-ready'],
    totalTests: 47_600,
    testsPer100k: 865,
    medianTat: 20.2,
    tatPct: 73.8,
    yoyGrowth: 8.5,
    per100kYoy: 1.9,
    per100kVsNat: -10.5,
    trend: makeTrend(820, 865, 900, 966),
  },
]

// ---------------------------------------------------------------------------
// Metric definitions — drive the map/ranking toggle and all formatting.
// ---------------------------------------------------------------------------
export const METRICS: Record<MetricKey, MetricDef> = {
  tests: {
    key: 'tests',
    label: 'Tests',
    longLabel: 'Total tests (12m)',
    lowerIsBetter: false,
    format: (v) => v.toLocaleString('en-GB'),
  },
  per100k: {
    key: 'per100k',
    label: 'Per 100k',
    longLabel: 'Tests per 100k population',
    lowerIsBetter: false,
    format: (v) => v.toLocaleString('en-GB'),
  },
  tat: {
    key: 'tat',
    label: 'TAT',
    longLabel: 'Median turnaround time',
    lowerIsBetter: true,
    format: (v) => `${v.toFixed(1)} d`,
  },
  tatPct: {
    key: 'tatPct',
    label: 'TAT %',
    longLabel: '% within TAT standard',
    lowerIsBetter: false,
    format: (v) => `${v.toFixed(1)}%`,
  },
}

export const METRIC_ORDER: MetricKey[] = ['tests', 'per100k', 'tat', 'tatPct']

/** Pull the raw value for a given metric off a hub. */
export function metricValue(hub: Hub, key: MetricKey): number {
  switch (key) {
    case 'tests': return hub.totalTests
    case 'per100k': return hub.testsPer100k
    case 'tat': return hub.medianTat
    case 'tatPct': return hub.tatPct
  }
}
