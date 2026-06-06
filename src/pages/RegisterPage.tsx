import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const hasSubmitted = useRef(false);

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

    if (hasSubmitted.current) {
      console.log('Submission already in progress');
      return;
    }

    hasSubmitted.current = true;
    setIsLoading(true);

    try {
      console.log('Registering user:', email);
      await register(email, password);
      console.log('Registration successful, navigating to dashboard');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);

      if (err?.message) {
        if (err.message.includes('already exists') ||
            err.message.includes('User with this email already exists')) {
          setError('Пользователь с таким email уже существует. Попробуйте войти или используйте другой email.');
        }
        else if (err?.response?.status === 400 && err?.response?.data?.detail?.includes('already exists')) {
          setError('Пользователь с таким email уже существует. Попробуйте войти или используйте другой email.');
        }
        else if (err.message.includes('password')) {
          setError('Пароль должен содержать минимум 6 символов');
        }
        else {
          setError('Ошибка регистрации. Попробуйте другой email или повторите попытку позже.');
        }
      } else {
        setError('Ошибка регистрации. Попробуйте другой email.');
      }

      hasSubmitted.current = false;
    } finally {
      setIsLoading(false);
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="login-link">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </div>

        <div className="terms-footer">
          <small>
            Регистрируясь, вы соглашаетесь с нашимы{' '}
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