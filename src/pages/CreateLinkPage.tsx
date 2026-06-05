import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './CreateLinkPage.css';

export default function CreateLinkPage() {
  const navigate = useNavigate();
  const { logout, userEmail } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      setError('Введите ссылку');
      return;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError('Введите корректный URL, например https://example.com');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.createShorten(normalizedUrl, true);
      navigate(`/links/${result.short_code}/result`, { state: { link: result } });
    } catch (error) {
      console.error('Failed to create link:', error);
      setError('Не удалось создать короткую ссылку. Попробуйте ещё раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="create-page-container">
      <div className="create-page-card">
        <div className="create-dashboard-header">
          <div>
            <h1 className="create-dashboard-title">Shortly</h1>
            <p className="create-dashboard-subtitle">Создайте новую короткую ссылку</p>
          </div>

          <div className="create-user-info">
            <div className="create-user-avatar">
              <span className="create-avatar-initials">
                {(userEmail || 'U').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="create-user-details">
              <button onClick={() => navigate('/dashboard')} className="create-user-email">
                {userEmail || 'user@example.com'}
              </button>
              <button onClick={handleLogout} className="create-logout-btn" aria-label="Выйти" title="Выйти">
                <svg viewBox="0 0 24 24" className="create-logout-icon" aria-hidden="true">
                  <path d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <main className="create-page-content">
          <section className="create-hero">
            <h1 className="create-page-title">Сократите ссылку<br />и получите QR-код</h1>
            <p className="create-page-subtitle">
              Вставьте длинную ссылку, чтобы получить короткую и удобную для использования.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="create-link-panel">
            <div className="create-input-row">
              <input
                id="original-url"
                type="text"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Вставьте длинную ссылку"
                className="create-url-input"
                disabled={isLoading}
              />
              <button type="submit" className="create-submit-btn" disabled={isLoading}>
                {isLoading ? 'Создание...' : 'Сократить'}
              </button>
            </div>
            {error && <div className="create-error">{error}</div>}
          </form>

          <div className="create-hints">
            <div className="create-hint">
              <svg viewBox="0 0 24 24" className="create-check-icon" aria-hidden="true">
                <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              QR-код создаётся автоматически
            </div>
            <div className="create-hint">
              <svg viewBox="0 0 24 24" className="create-check-icon" aria-hidden="true">
                <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Можно настроить после создания
            </div>
          </div>

          <section className="create-benefits">
            <article className="create-benefit-card">
              <div className="create-benefit-icon">
                <svg viewBox="0 0 24 24" className="create-benefit-svg create-benefit-bolt" aria-hidden="true">
                  <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
                </svg>
              </div>
              <h2>Быстро</h2>
              <p>Мгновенное сокращение ссылок</p>
            </article>

            <article className="create-benefit-card">
              <div className="create-benefit-icon">
                <svg viewBox="0 0 24 24" className="create-benefit-svg" aria-hidden="true">
                  <path d="M6 19V12" />
                  <path d="M12 19V8" />
                  <path d="M18 19V5" />
                </svg>
              </div>
              <h2>Удобно</h2>
              <p>Отслеживайте статистику переходов</p>
            </article>

            <article className="create-benefit-card">
              <div className="create-benefit-icon">
                <svg viewBox="0 0 24 24" className="create-benefit-svg create-benefit-shield" aria-hidden="true">
                  <path d="M12 3L19 6V11C19 15.5 16.2 19 12 21C7.8 19 5 15.5 5 11V6L12 3Z" />
                </svg>
              </div>
              <h2>Надёжно</h2>
              <p>Безопасные и стабильные ссылки</p>
            </article>
          </section>
        </main>

        <div className="create-page-footer">
          © 2026 Shortly. Все права защищены.
        </div>
      </div>
    </div>
  );
}
