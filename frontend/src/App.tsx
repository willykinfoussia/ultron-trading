import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>📊 <span>Ultron</span> Trading</h1>
        <div className="header-right">
          Real-time market data
        </div>
      </header>
      <main className="main">
        <Dashboard />
      </main>
    </div>
  )
}

export default App
