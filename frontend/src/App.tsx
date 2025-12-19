/**
 * Hollow Knight 112% Tracker - Main App Component
 * 
 * Architecture:
 * - Single page app with filterable table and SQL console
 * - All state managed locally with React hooks
 * - API calls to FastAPI backend at localhost:8000
 */

import { useState, useEffect, useCallback } from 'react'
import { ItemsTable } from './components/ItemsTable'
import { Filters } from './components/Filters'
import { SQLConsole } from './components/SQLConsole'
import { ProgressBar } from './components/ProgressBar'
import { HKItem, Filters as FiltersType, Stats } from './types'
import { fetchItems, fetchStats, fetchCategories, fetchRegions, updateItemFound } from './api'
import './App.css'

function App() {
  // Items state
  const [items, setItems] = useState<HKItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<FiltersType>({
    found: null,
    category: '',
    region: '',
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
    <div className="app">
      <header className="app-header">
        <h1><img src="/elderbug.png" alt="Elderbug" className="header-icon" /> Hollow Knight 112% Tracker</h1>
        {stats && <ProgressBar stats={stats} />}
      </header>

      <main className="app-main">
        <section className="items-section">
          <Filters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            regions={regions}
          />

          {error && <div className="error-message">{error}</div>}
          
          <ItemsTable
            items={items}
            loading={loading}
            onToggleFound={handleToggleFound}
          />
        </section>

        <section className="sql-section">
          <SQLConsole />
        </section>
      </main>
    </div>
  )
}

export default App
