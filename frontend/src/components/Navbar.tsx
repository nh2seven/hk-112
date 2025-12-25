/**
 * Navbar Component
 * 
 * Left sidebar navigation with links to all pages
 */

import { NavLink } from 'react-router-dom'
import './Navbar.css'

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-header">
        <img src="/elderbug.png" alt="Elderbug" className="navbar-icon" />
        <span className="navbar-title">HK 112%</span>
      </div>
      
      <ul className="navbar-links">
        <li>
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Overview</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/checklist" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <span className="nav-icon">✅</span>
            <span className="nav-text">112% Checklist</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/session" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <span className="nav-icon">🎮</span>
            <span className="nav-text">Current Session</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/sql-console" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-text">SQL Console</span>
          </NavLink>
        </li>
      </ul>
      
      <div className="navbar-footer">
        <span className="version">v2.0.0</span>
      </div>
    </nav>
  )
}
