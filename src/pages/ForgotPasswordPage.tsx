import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasSubmitted = useRef(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Введите email');
      return;
    }

    if (hasSubmitted.current) {
      console.log('Submission already in progress');
      return;
    }

    hasSubmitted.current = true;
    setIsLoading(true);

    try {
      await apiClient.forgotPassword(email);
      setSuccess('Код для сброса пароля отправлен на ваш email');
      setStep('reset');
    } catch (err) {
      console.error('Forgot password error:', err);
      setSuccess('Если email зарегистрирован, вы получите код для сброса пароля');
      setStep('reset');
    } finally {
      setIsLoading(false);
      hasSubmitted.current = false;
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!code || !newPassword || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
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
      await apiClient.resetPassword(email, code, newPassword);
      setSuccess('Пароль успешно изменён!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Неверный или просроченный код восстановления');
      hasSubmitted.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Shortly</h1>

        {step === 'request' ? (
          <>
            <p className="auth-subtitle">
              Введите email, на который отправить код для сброса пароля
            </p>

            <form onSubmit={handleRequestReset}>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

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

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Отправка...' : 'Отправить код'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Введите код из письма и новый пароль
            </p>

            <form onSubmit={handleResetPassword}>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-group">
                <label>Код из письма</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Введите 6-значный код"
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label>Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
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
                {isLoading ? 'Сброс...' : 'Сбросить пароль'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          <Link to="/login">Вернуться ко входу</Link>
        </div>

        <div className="copyright">
          © 2026 Shortly. Все права защищены.
        </div>
      </div>
    </div>
  );
}