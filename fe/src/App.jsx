import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import SelectionPage from './pages/Selection/SelectionPage';
import AdminPage from './pages/Admin/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SelectionPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
