/**
 * Hollow Knight 112% Tracker - Main App Component
 * 
 * Architecture:
 * - Multi-page app with React Router
 * - Left navbar for navigation
 * - Pages: Overview, Checklist, Session, SQL Console
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Overview } from './pages/Overview'
import { Checklist } from './pages/Checklist'
import { SessionPage } from './pages/Session'
import { SQLConsolePage } from './pages/SQLConsolePage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/session" element={<SessionPage />} />
            <Route path="/sql-console" element={<SQLConsolePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
