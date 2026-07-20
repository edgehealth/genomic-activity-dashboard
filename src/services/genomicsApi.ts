// ---------------------------------------------------------------------------
// Dashboard Data API client — genomics metrics.
//
// Adapted from fingertips-dashboard/src/services/fingertipsApi.ts. That app is
// Create React App (process.env.REACT_APP_*); this one is Vite, so config comes
// from import.meta.env.VITE_* instead. Same API, different (versioned) route:
// /v1/genomics rather than /indicators.
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_DASH_API_BASE_URL
const API_KEY = import.meta.env.VITE_DASH_API_KEY

/** One row of the long-format `vw_genomics_metrics` view. */
export interface GenomicsRow {
  metric_id: string
  /** GLH region name (region_of_reporting); null for national metrics. */
  glh: string | null
  /** Always null in the current view (ICB is an intermediate only). */
  icb: string | null
  /** Breakdown value: cancer type / specialist category / age / gene site. */
  sub_category: string | null
  /** Gene name (gen_11 only); null otherwise. */
  gene: string | null
  /** The count that drives the metric — always additive. */
  numerator: number
  /** total/population for rate & % metrics; null for pure counts. */
  denominator: number | null
  time_grain: 'month' | 'year'
  /** Month-end (or year-end) date, as a Unix timestamp in milliseconds (UTC). */
  time_period: number
}

interface Pagination {
  page: number
  page_size: number
  total_records: number
  total_pages: number
}

interface GenomicsResponse {
  data: GenomicsRow[]
  pagination: Pagination
}

const PAGE_SIZE = 5000 // MAX_PAGE_SIZE on the API

function assertConfigured() {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error(
      'Dashboard API is not configured. Set VITE_DASH_API_BASE_URL and ' +
        'VITE_DASH_API_KEY (see .env.example) and restart the dev server.',
    )
  }
}

async function fetchPage(page: number): Promise<GenomicsResponse> {
  const url =
    `${API_BASE_URL}/v1/genomics?code=${encodeURIComponent(API_KEY)}` +
    `&page=${page}&page_size=${PAGE_SIZE}`

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Genomics API HTTP ${response.status}`)
  }
  return (await response.json()) as GenomicsResponse
}

/**
 * Fetch every genomics metric row, following pagination until all pages are in.
 * The view is small (a few thousand rows), so one or two pages is typical.
 */
export async function getGenomicsMetrics(): Promise<GenomicsRow[]> {
  assertConfigured()

  const first = await fetchPage(1)
  const rows = [...first.data]

  for (let page = 2; page <= first.pagination.total_pages; page++) {
    const next = await fetchPage(page)
    rows.push(...next.data)
  }

  return rows
}
