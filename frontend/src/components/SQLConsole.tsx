/**
 * SQL Console Component
 * 
 * Embedded SQL console for running read-only queries:
 * - Textarea for SQL input
 * - Execute button
 * - Results table display
 * - Error handling
 */

import { useState } from 'react'
import { executeSQL } from '../api'
import { SQLResult } from '../types'
import './SQLConsole.css'

export function SQLConsole() {
  const [query, setQuery] = useState('SELECT * FROM hk LIMIT 10')
  const [result, setResult] = useState<SQLResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleExecute = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await executeSQL(query)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleExecute()
    }
  }

  // Example queries for quick access
  const exampleQueries = [
    { label: 'All Items', query: 'SELECT * FROM hk ORDER BY id' },
    { label: 'Not Found', query: 'SELECT name, category, region FROM hk WHERE found = false' },
    { label: 'By Category', query: 'SELECT category, COUNT(*) as count FROM hk GROUP BY category ORDER BY count DESC' },
    { label: 'By Region', query: 'SELECT region, COUNT(*) as count FROM hk GROUP BY region ORDER BY count DESC' },
    { label: 'Progress', query: 'SELECT found, COUNT(*) as count FROM hk GROUP BY found' },
  ]

  return (
    <div className="sql-console">
      <div className="sql-header">
        <h2>🔍 SQL Console</h2>
        <span className="sql-hint">SELECT queries only • Ctrl+Enter to execute</span>
      </div>

      <div className="sql-examples">
        {exampleQueries.map((eq, i) => (
          <button
            key={i}
            className="example-btn"
            onClick={() => setQuery(eq.query)}
          >
            {eq.label}
          </button>
        ))}
      </div>

      <div className="sql-input-area">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter SELECT query..."
          className="sql-textarea"
          rows={4}
        />
        <button
          onClick={handleExecute}
          disabled={loading || !query.trim()}
          className="sql-execute-btn"
        >
          {loading ? 'Running...' : 'Execute'}
        </button>
      </div>

      {error && (
        <div className="sql-error">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="sql-result">
          <div className="sql-result-info">
            {result.row_count} row{result.row_count !== 1 ? 's' : ''} returned
          </div>
          <div className="sql-result-table-container">
            <table className="sql-result-table">
              <thead>
                <tr>
                  {result.columns.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx}>
                        {formatCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Format cell values for display
 */
function formatCell(value: unknown): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...'
  }
  return String(value)
}
