/**
 * API client for the Hollow Knight Tracker backend
 * 
 * In production (Docker): Uses /api prefix, proxied by nginx
 * In development: Uses Vite proxy or direct localhost:8000
 */

import { HKItem, Filters, Stats, SQLResult } from './types'

// Use /api prefix in production (nginx proxies to backend)
// In dev mode, Vite proxies /api to localhost:8000
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000'

/**
 * Fetch items with optional filters
 */
export async function fetchItems(filters: Filters): Promise<HKItem[]> {
  const params = new URLSearchParams()
  
  if (filters.found !== null) {
    params.set('found', String(filters.found))
  }
  if (filters.category) {
    params.set('category', filters.category)
  }
  if (filters.region) {
    params.set('region', filters.region)
  }
  if (filters.name) {
    params.set('name', filters.name)
  }

  const url = `${API_BASE}/items${params.toString() ? '?' + params.toString() : ''}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Update an item's found status
 */
export async function updateItemFound(id: number, found: boolean): Promise<HKItem> {
  const response = await fetch(`${API_BASE}/items/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ found })
  })

  if (!response.ok) {
    throw new Error(`Failed to update item: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Execute a read-only SQL query
 */
export async function executeSQL(query: string): Promise<SQLResult> {
  const response = await fetch(`${API_BASE}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(errorData.detail || `Query failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch completion statistics
 */
export async function fetchStats(): Promise<Stats> {
  const response = await fetch(`${API_BASE}/stats`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch all unique categories
 */
export async function fetchCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/categories`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch all unique regions
 */
export async function fetchRegions(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/regions`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch regions: ${response.statusText}`)
  }
  
  return response.json()
}
