/**
 * Type definitions for the Hollow Knight Tracker
 */

export interface HKItem {
  id: number
  found: boolean
  name: string
  category: string
  region: string
  information: string
  location_url: string | null
}

export interface Filters {
  found: boolean | null
  category: string
  region: string
  name: string
}

export interface Stats {
  total: number
  found_count: number
  not_found_count: number
  completion_percent: number
}

export interface SQLResult {
  columns: string[]
  rows: unknown[][]
  row_count: number
}
