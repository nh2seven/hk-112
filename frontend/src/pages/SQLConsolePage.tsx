/**
 * SQL Console Page
 * 
 * Dedicated page for the SQL console
 */

import { SQLConsole } from '../components/SQLConsole'
import './SQLConsolePage.css'

export function SQLConsolePage() {
  return (
    <div className="sql-console-page">
      <header className="sql-page-header">
        <h1>SQL Console</h1>
        <p className="sql-page-subtitle">Execute read-only SQL queries on the database</p>
      </header>

      <div className="sql-page-content">
        <SQLConsole />
      </div>
    </div>
  )
}
