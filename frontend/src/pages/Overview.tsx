/**
 * Overview Page
 * 
 * Dashboard showing completion statistics:
 * - Overall completion percentage
 * - Completion by region (clickable)
 * - Completion by category (clickable)
 * - Total items found vs total
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar'
import { Stats, RegionStats, CategoryStats } from '../types'
import { fetchStats, fetchRegionStats, fetchCategoryStats } from '../api'
import './Overview.css'

export function Overview() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [regionStats, setRegionStats] = useState<RegionStats[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate completed regions/categories
  const completedRegions = useMemo(() => {
    const completed = regionStats.filter(r => r.completion_percent === 100).length
    return { completed, total: regionStats.length }
  }, [regionStats])

  const completedCategories = useMemo(() => {
    const completed = categoryStats.filter(c => c.completion_percent === 100).length
    return { completed, total: categoryStats.length }
  }, [categoryStats])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [statsData, regionData, categoryData] = await Promise.all([
          fetchStats(),
          fetchRegionStats(),
          fetchCategoryStats()
        ])
        setStats(statsData)
        setRegionStats(regionData)
        setCategoryStats(categoryData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleRegionClick = (region: string) => {
    navigate(`/checklist?region=${encodeURIComponent(region)}`)
  }

  const handleCategoryClick = (category: string) => {
    navigate(`/checklist?category=${encodeURIComponent(category)}`)
  }

  if (loading) {
    return <div className="overview-loading">Loading statistics...</div>
  }

  if (error) {
    return <div className="overview-error">{error}</div>
  }

  if (!stats) {
    return <div className="overview-error">No statistics available</div>
  }

  const regionsPercent = completedRegions.total > 0 
    ? Math.round((completedRegions.completed / completedRegions.total) * 100) 
    : 0
  
  const categoriesPercent = completedCategories.total > 0 
    ? Math.round((completedCategories.completed / completedCategories.total) * 100) 
    : 0

  return (
    <div className="overview">
      <header className="overview-header">
        <h1>Overview</h1>
        <p className="overview-subtitle">Your 112% completion progress at a glance</p>
      </header>

      {/* Overall Progress Section */}
      <section className="overview-section overall-section">
        <h2>Overall Progress</h2>
        <div className="overall-card">
          <div className="overall-progress">
            <ProgressBar stats={stats} />
          </div>
          <div className="overall-stats">
            <div className="stat-item">
              <span className="stat-value found">{stats.found_count}</span>
              <span className="stat-label">Found</span>
            </div>
            <div className="stat-item">
              <span className="stat-value not-found">{stats.not_found_count}</span>
              <span className="stat-label">Remaining</span>
            </div>
            <div className="stat-item">
              <span className="stat-value total">{stats.total}</span>
              <span className="stat-label">Total Items</span>
            </div>
          </div>
          
          {/* Secondary Progress Bars */}
          <div className="secondary-progress">
            <div className="secondary-progress-item">
              <div className="secondary-progress-header">
                <span className="secondary-progress-label">Regions Completed</span>
                <span className="secondary-progress-count">
                  {completedRegions.completed} / {completedRegions.total}
                </span>
              </div>
              <div className="secondary-progress-bar">
                <div 
                  className="secondary-progress-fill regions"
                  style={{ width: `${regionsPercent}%` }}
                />
              </div>
            </div>
            
            <div className="secondary-progress-item">
              <div className="secondary-progress-header">
                <span className="secondary-progress-label">Categories Completed</span>
                <span className="secondary-progress-count">
                  {completedCategories.completed} / {completedCategories.total}
                </span>
              </div>
              <div className="secondary-progress-bar">
                <div 
                  className="secondary-progress-fill categories"
                  style={{ width: `${categoriesPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Region Progress Section */}
      <section className="overview-section">
        <h2>Progress by Region</h2>
        <p className="section-hint">Click on a region to view its items</p>
        <div className="stats-grid">
          {regionStats.map((region) => (
            <div 
              key={region.region} 
              className="stat-card clickable"
              onClick={() => handleRegionClick(region.region)}
            >
              <div className="stat-card-header">
                <h3>{region.region}</h3>
                <span className="stat-percent">{region.completion_percent}%</span>
              </div>
              <div className="stat-card-bar">
                <div 
                  className="stat-card-fill"
                  style={{ width: `${region.completion_percent}%` }}
                />
              </div>
              <div className="stat-card-counts">
                <span className="found">{region.found_count}</span>
                <span className="separator">/</span>
                <span className="total">{region.total}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Progress Section */}
      <section className="overview-section">
        <h2>Progress by Category</h2>
        <p className="section-hint">Click on a category to view its items</p>
        <div className="stats-grid">
          {categoryStats.map((category) => (
            <div 
              key={category.category} 
              className="stat-card clickable"
              onClick={() => handleCategoryClick(category.category)}
            >
              <div className="stat-card-header">
                <h3>{category.category}</h3>
                <span className="stat-percent">{category.completion_percent}%</span>
              </div>
              <div className="stat-card-bar">
                <div 
                  className="stat-card-fill"
                  style={{ width: `${category.completion_percent}%` }}
                />
              </div>
              <div className="stat-card-counts">
                <span className="found">{category.found_count}</span>
                <span className="separator">/</span>
                <span className="total">{category.total}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
