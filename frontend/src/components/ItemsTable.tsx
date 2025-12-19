/**
 * Items Table Component
 * 
 * Displays the main table of Hollow Knight items with:
 * - Checkbox to toggle found status
 * - Formatted information column
 * - Clickable location URLs
 */

import { HKItem } from '../types'
import './ItemsTable.css'

interface Props {
  items: HKItem[]
  loading: boolean
  onToggleFound: (item: HKItem) => void
}

export function ItemsTable({ items, loading, onToggleFound }: Props) {
  if (loading) {
    return <div className="loading">Loading items...</div>
  }

  if (items.length === 0) {
    return <div className="no-items">No items found matching filters</div>
  }

  return (
    <div className="table-container">
      <table className="items-table">
        <thead>
          <tr>
            <th className="col-found">Found</th>
            <th className="col-id">ID</th>
            <th className="col-name">Name</th>
            <th className="col-category">Category</th>
            <th className="col-region">Region</th>
            <th className="col-info">Information</th>
            <th className="col-link">Link</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className={item.found ? 'row-found' : 'row-not-found'}>
              <td className="col-found">
                <input
                  type="checkbox"
                  checked={item.found}
                  onChange={() => onToggleFound(item)}
                  aria-label={`Mark ${item.name} as ${item.found ? 'not found' : 'found'}`}
                />
              </td>
              <td className="col-id">{item.id}</td>
              <td className="col-name">{item.name}</td>
              <td className="col-category">
                <span className={`category-badge category-${item.category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.category}
                </span>
              </td>
              <td className="col-region">{item.region}</td>
              <td className="col-info">
                <FormattedInfo text={item.information} />
              </td>
              <td className="col-link">
                {item.location_url && (
                  <a
                    href={item.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    📍 Map
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Render information text with basic formatting
 * - Preserves line breaks
 * - Safely renders basic HTML tags
 */
function FormattedInfo({ text }: { text: string }) {
  if (!text) return null

  // Convert markdown-style formatting and preserve structure
  // Convert **text** to bold
  let formatted = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // Convert <br> and <br/> to newlines for display
  formatted = formatted.replace(/<br\s*\/?>/gi, '\n')
  
  // Split by newlines and render as separate lines
  const lines = formatted.split('\n').filter(line => line.trim())

  return (
    <div className="info-text">
      {lines.map((line, index) => (
        <p key={index} dangerouslySetInnerHTML={{ __html: line }} />
      ))}
    </div>
  )
}
