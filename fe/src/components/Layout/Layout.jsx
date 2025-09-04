import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Container from '../Container';
import './Layout.css';
import logo from '../../assets/logo.png';

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="layout">
      <header className="layout-header">
          <div className="layout-header-content">
            <div className="layout-logo-image">
                <img src={logo} alt="Logo" />
            </div>
            <div className="layout-logo">
              <h1>Biểu Mẫu Tự Đánh Giá Mức Độ Hoàn Thành Công Việc</h1>
            </div>
            <nav className="layout-nav">
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link 
                to="/admin" 
                className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                Admin
              </Link>
            </nav>
          </div>
      </header>
      
      <main className="layout-main">
        <Container>
          <div className="layout-content">
            {children}
          </div>
        </Container>
      </main>
      
      <footer className="layout-footer">
        <Container>
          <div className="layout-footer-content">
            <p>&copy; 2025 Form Review System. All rights reserved.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default Layout;
