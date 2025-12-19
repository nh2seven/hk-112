/**
 * Progress Bar Component
 * 
 * Shows completion percentage based on items marked as found
 */

import { Stats } from '../types'
import './ProgressBar.css'

interface Props {
  stats: Stats
}

export function ProgressBar({ stats }: Props) {
  return (
    <div className="progress-bar-container">
      <div className="progress-stats">
        <span className="progress-found">{stats.found_count}</span>
        <span className="progress-separator">/</span>
        <span className="progress-total">{stats.total}</span>
        <span className="progress-percent">({stats.completion_percent}%)</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${stats.completion_percent}%` }}
        />
      </div>
    </div>
  )
}
