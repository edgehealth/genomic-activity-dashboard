import { useMemo } from 'react'
import icbFeaturesRaw from '../data/icb-features.json'
import glhOutlinesRaw from '../data/glh-outlines.json'

// ---------------------------------------------------------------------------
// Map geometry hook — adapted from the fingertips-dashboard implementation
// (src/pages/Fingertips/hooks/useMap.ts): a simple linear lng/lat → SVG
// projection with paths built ring-by-ring. Unlike d3-geo's spherical
// renderer, planar SVG fills don't depend on polygon winding order, so the
// RFC 7946 GeoJSON that mapshaper emits renders correctly as-is.
// ---------------------------------------------------------------------------

export const MAP_WIDTH = 500
export const MAP_HEIGHT = 600

export interface IcbFeature {
  properties: { icbCode: string; icbName: string; glhId: string }
  geometry: { type: string; coordinates: unknown }
}

export interface GlhFeature {
  properties: { glhId: string }
  geometry: { type: string; coordinates: unknown }
}

interface MapBounds {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

const icbFeatures = (icbFeaturesRaw as { features: IcbFeature[] }).features
const glhFeatures = (glhOutlinesRaw as { features: GlhFeature[] }).features

// Flatten nested coordinate arrays from GeoJSON
function flattenCoordinates(coords: unknown): number[][] {
  const result: number[][] = []
  const flatten = (arr: unknown) => {
    if (Array.isArray(arr) && arr.length > 0) {
      if (typeof arr[0] === 'number' && arr.length === 2) {
        result.push(arr as number[])
      } else {
        arr.forEach(flatten)
      }
    }
  }
  flatten(coords)
  return result
}

// Calculate actual bounds from the GeoJSON data (with a small padding),
// computed once — the boundary files are static imports.
function computeBounds(features: IcbFeature[]): MapBounds {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  features.forEach((feature) => {
    flattenCoordinates(feature.geometry.coordinates).forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    })
  })

  const lngPadding = (maxLng - minLng) * 0.02
  const latPadding = (maxLat - minLat) * 0.02

  return {
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding,
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
  }
}

const bounds = computeBounds(icbFeatures)

// Project geographic coordinates to SVG coordinates
function projectToSVG(lng: number, lat: number) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * MAP_WIDTH
  const y = MAP_HEIGHT - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * MAP_HEIGHT
  return { x, y }
}

// Convert GeoJSON Polygon/MultiPolygon coordinates to an SVG path string
export function coordinatesToPath(coordinates: unknown): string {
  const paths: string[] = []
  const coords = coordinates as number[][][] | number[][][][]

  const polygons =
    coords[0] && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])
      ? (coords as number[][][][])
      : [coords as number[][][]]

  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      if (ring.length < 3) return
      const pathCommands = ring.map(([lng, lat], index) => {
        const { x, y } = projectToSVG(lng, lat)
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      paths.push(pathCommands.join(' ') + ' Z')
    })
  })

  return paths.join(' ')
}

export function useMap() {
  // Path strings never change — build them once per mount.
  const icbPaths = useMemo(
    () =>
      icbFeatures.map((f) => ({
        props: f.properties,
        d: coordinatesToPath(f.geometry.coordinates),
      })),
    [],
  )

  const glhPaths = useMemo(
    () =>
      glhFeatures.map((f) => ({
        glhId: f.properties.glhId,
        d: coordinatesToPath(f.geometry.coordinates),
      })),
    [],
  )

  return { icbPaths, glhPaths }
}
