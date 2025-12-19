/**
 * Filters Component
 * 
 * Filter controls for the items table:
 * - Found/Not Found checkbox filter
 * - Category dropdown
 * - Region dropdown
 * - Name text search
 */

import { Filters as FiltersType } from '../types'
import './Filters.css'

interface Props {
  filters: FiltersType
  onFiltersChange: (filters: FiltersType) => void
  categories: string[]
  regions: string[]
}

export function Filters({ filters, onFiltersChange, categories, regions }: Props) {
  const updateFilter = <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="filters">
      <div className="filter-group">
        <label>Status</label>
        <select
          value={filters.found === null ? '' : String(filters.found)}
          onChange={(e) => {
            const val = e.target.value
            updateFilter('found', val === '' ? null : val === 'true')
          }}
        >
          <option value="">All</option>
          <option value="true">Found</option>
          <option value="false">Not Found</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Category</label>
        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Region</label>
        <select
          value={filters.region}
          onChange={(e) => updateFilter('region', e.target.value)}
        >
          <option value="">All Regions</option>
          {regions.map(reg => (
            <option key={reg} value={reg}>{reg}</option>
          ))}
        </select>
      </div>

      <div className="filter-group filter-search">
        <label>Search</label>
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.name}
          onChange={(e) => updateFilter('name', e.target.value)}
        />
      </div>

      <button
        className="filter-reset"
        onClick={() => onFiltersChange({
          found: null,
          category: '',
          region: '',
          name: ''
        })}
      >
        Reset Filters
      </button>
    </div>
  )
}
