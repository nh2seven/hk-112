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

export interface RegionStats {
  region: string
  total: number
  found_count: number
  not_found_count: number
  completion_percent: number
}

export interface CategoryStats {
  category: string
  total: number
  found_count: number
  not_found_count: number
  completion_percent: number
}

export interface SessionItem extends HKItem {
  added_at: string
}

export interface Session {
  id: number
  name: string
  created_at: string
  saved_at: string | null
  item_count: number
  items?: SessionItem[]
}

export interface SQLResult {
  columns: string[]
  rows: unknown[][]
  row_count: number
}
