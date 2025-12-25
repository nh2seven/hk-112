/**
 * Checklist Page
 * 
 * Main item list with filters and item toggling
 * Moved from original App.tsx functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ItemsTable } from '../components/ItemsTable'
import { Filters } from '../components/Filters'
import { ProgressBar } from '../components/ProgressBar'
import { HKItem, Filters as FiltersType, Stats } from '../types'
import { fetchItems, fetchStats, fetchCategories, fetchRegions, updateItemFound } from '../api'
import './Checklist.css'

export function Checklist() {
  const [searchParams] = useSearchParams()
  
  // Items state
  const [items, setItems] = useState<HKItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state - initialize from URL params
  const [filters, setFilters] = useState<FiltersType>({
    found: null,
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
    name: ''
  })

  // Filter options
  const [categories, setCategories] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])

  // Stats for progress bar
  const [stats, setStats] = useState<Stats | null>(null)

  // Load filter options on mount
  useEffect(() => {
    Promise.all([fetchCategories(), fetchRegions()])
      .then(([cats, regs]) => {
        setCategories(cats)
        setRegions(regs)
      })
      .catch(err => console.error('Failed to load filter options:', err))
  }, [])

  // Update filters when URL params change
  useEffect(() => {
    const category = searchParams.get('category') || ''
    const region = searchParams.get('region') || ''
    if (category || region) {
      setFilters(prev => ({
        ...prev,
        category,
        region
      }))
    }
  }, [searchParams])

  // Load items when filters change
  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchItems(filters)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }, [])

  useEffect(() => {
    loadItems()
    loadStats()
  }, [loadItems, loadStats])

  // Handle toggling found status with optimistic update
  const handleToggleFound = async (item: HKItem) => {
    const newFound = !item.found
    
    // Optimistic update
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, found: newFound } : i
    ))

    try {
      await updateItemFound(item.id, newFound)
      // Reload stats after successful update
      loadStats()
    } catch (err) {
      // Rollback on failure
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, found: !newFound } : i
      ))
      console.error('Failed to update item:', err)
    }
  }

  return (
    <div className="checklist">
      <header className="checklist-header">
        <div className="checklist-title">
          <h1>112% Checklist</h1>
          {stats && <ProgressBar stats={stats} />}
        </div>
      </header>

      <div className="checklist-content">
        <Filters
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          regions={regions}
        />

        {error && <div className="error-message">{error}</div>}
        
        <div className="items-count">
          {!loading && (
            <span>
              Showing <strong>{items.length}</strong> item{items.length !== 1 ? 's' : ''}
              {(filters.category || filters.region || filters.name || filters.found !== null) && ' (filtered)'}
            </span>
          )}
        </div>

        <ItemsTable
          items={items}
          loading={loading}
          onToggleFound={handleToggleFound}
        />
      </div>
    </div>
  )
}
