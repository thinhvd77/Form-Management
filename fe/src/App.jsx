import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import SelectionPage from './pages/Selection/SelectionPage';
import AdminPage from './pages/Admin/AdminPage';

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <div style={{ padding: '12px', borderBottom: '1px solid #eee', marginBottom: 16, display: 'flex', gap: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/admin">Admin</Link>
      </div>
      <Routes>
        <Route path="/" element={<SelectionPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
