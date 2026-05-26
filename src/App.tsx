import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

const TermsPage = () => <div style={{ padding: '2rem' }}>Условия использования (скоро)</div>;
const PrivacyPage = () => <div style={{ padding: '2rem' }}>Политика конфиденциальности (скоро)</div>;
const ForgotPasswordPage = () => <div style={{ padding: '2rem' }}>Восстановление пароля (скоро)</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* auth pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* dashboard  not protected */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;