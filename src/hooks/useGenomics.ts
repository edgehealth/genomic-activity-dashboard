import { useEffect, useState } from 'react'
import { getGenomicsMetrics } from '../services/genomicsApi'
import { buildGenomicsData, type GenomicsData } from '../data/transform'

interface State {
  data: GenomicsData | null
  loading: boolean
  error: string | null
}

/**
 * Fetch the genomics metrics once on mount and transform them into the
 * Hub[] + NationalSummary the dashboard renders.
 */
export function useGenomics(): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    getGenomicsMetrics()
      .then((rows) => {
        if (cancelled) return
        setState({ data: buildGenomicsData(rows), loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load genomics data.'
        console.error('useGenomics:', err)
        setState({ data: null, loading: false, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
