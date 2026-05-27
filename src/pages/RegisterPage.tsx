import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './AuthPages.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      await register(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Ошибка регистрации. Попробуйте другой email.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Shortly</h1>
        <p className="auth-subtitle">Создайте аккаунт, чтобы управлять своими ссылками и отслеживать статистику.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              required
            />
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>

          <div className="form-group">
            <label>Подтвердите пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Зарегистрироваться
          </button>
        </form>

        <div className="divider">
          <span>или</span>
        </div>

        <div className="social-buttons">
          <button className="social-btn disabled" disabled>
            <span>📧</span> Продолжить с Google
          </button>
          <button className="social-btn disabled" disabled>
            <span>🐱</span> Продолжить с GitHub
          </button>
        </div>

        {/* Login page */}
        <div className="auth-footer">
          <p className="login-link">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </div>

        <div className="terms-footer">
          <small>
            Регистрируясь, вы соглашаетесь с нашими{' '}
            <Link to="/terms">Условиями использования</Link> и{' '}
            <Link to="/privacy">Политикой конфиденциальности</Link>
          </small>
        </div>

        <div className="copyright">
          © 2026 Shortly. Все права защищены.
        </div>
      </div>
    </div>
  );
}