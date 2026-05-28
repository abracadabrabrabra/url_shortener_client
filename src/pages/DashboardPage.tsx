import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Link as LinkType } from '../types';
import './DashboardPage.css';

export default function DashboardPage() {
  const { isAuthenticated, logout, userEmail } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  console.log('DashboardPage rendering', { isAuthenticated, userEmail, linksCount: links.length });

  const loadLinks = useCallback(async (reset: boolean = false) => {
    if (loadingRef.current) return;

    const currentPage = reset ? 0 : page;
    const offset = currentPage * pageSize;

    loadingRef.current = true;
    setLoading(true);

    try {
      console.log(`Loading links: offset=${offset}, limit=${pageSize}`);
      const data = await apiClient.getUserLinks(offset, pageSize, false);

      if (reset) {
        setLinks(data);
        setPage(1);
      } else {
        setLinks(prev => [...prev, ...data]);
        setPage(prev => prev + 1);
      }

      setHasMore(data.length === pageSize);

      console.log(`Loaded ${data.length} links, hasMore: ${data.length === pageSize}`);
    } catch (error) {
      console.error('Failed to load links:', error);
      if (error instanceof Error && error.message === 'Unauthorized') {
        navigate('/login');
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, pageSize, navigate]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && !loading) {
          console.log('Loading more links...');
          loadLinks(false);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadLinks]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setLinks([]);
    setPage(0);
    setHasMore(true);
    loadLinks(true);
  }, [isAuthenticated, navigate]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUrl) {
      setError('Пожалуйста, введите URL');
      return;
    }

    let validatedUrl = newUrl;
    try {
      if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        validatedUrl = 'https://' + newUrl;
      }
      new URL(validatedUrl);
    } catch {
      setError('Пожалуйста, введите корректный URL (например, https://example.com)');
      return;
    }

    try {
      console.log('Creating short link for:', validatedUrl);
      const result = await apiClient.createShorten(validatedUrl, true);

      const newLink: LinkType = {
        short_key: result.short_code,
        original_url: result.original_url,
        short_url: result.short_url,
        user_id: result.user_id || null,
        clicks_count: 0,
        created_at: new Date().toISOString(),
      };

      setLinks(prevLinks => [newLink, ...prevLinks]);
      setNewUrl('');
      console.log('Created short link:', result);
    } catch (error) {
      console.error('Failed to create link:', error);
      setError('Ошибка при создании ссылки. Попробуйте позже.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCopyLink = (shortUrl: string) => {
    navigator.clipboard.writeText(shortUrl);
    alert('Ссылка скопирована в буфер обмена!');
  };

  const handleViewStats = (shortKey: string) => {
    navigate(`/links/${shortKey}/stats`);
    console.log('View stats for:', shortKey);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Shortly</h1>
            <p className="dashboard-subtitle">Управляйте своими короткими ссылками</p>
          </div>

          <div className="user-info">
            <div className="user-avatar">
              <span className="avatar-initials">
                {(userEmail || 'U').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="user-details">
              <span className="user-email">{userEmail || 'user@example.com'}</span>
              <button onClick={handleLogout} className="logout-btn">
                Выйти
              </button>
            </div>
          </div>
        </div>

        <div className="create-link-section">
          <h2>Создать новую ссылку</h2>
          {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleCreateLink} className="create-link-form">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Введите длинную ссылку (например, example.com)"
              className="create-link-input"
              required
            />
            <button type="submit" className="create-link-btn" disabled={loading}>
              {loading ? 'Создание...' : 'Сократить'}
            </button>
          </form>
        </div>

        <div className="links-section">
          <h2>Мои ссылки</h2>
          {links.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔗</div>
              <p>У вас пока нет созданных ссылок</p>
              <p style={{ fontSize: '14px', color: '#999' }}>
                Создайте первую ссылку с помощью формы выше
              </p>
            </div>
          ) : (
            <div className="links-table-container">
              <table className="links-table">
                <thead>
                  <tr>
                    <th>Короткая ссылка</th>
                    <th>Оригинальная ссылка</th>
                    <th>Переходы</th>
                    <th>Дата создания</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr key={link.short_key}>
                      <td>
                        <a
                          href={link.short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="short-link"
                        >
                          {link.short_key}
                        </a>
                      </td>
                      <td>
                        <a href={link.original_url} target="_blank" rel="noopener noreferrer">
                          {link.original_url.length > 50
                            ? link.original_url.substring(0, 50) + '...'
                            : link.original_url}
                        </a>
                      </td>
                      <td>
                        <span className="clicks-badge">{link.clicks_count || 0}</span>
                      </td>
                      <td>
                        {link.created_at
                          ? new Date(link.created_at).toLocaleDateString('ru-RU')
                          : '-'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleCopyLink(link.short_url)}
                            className="copy-btn"
                            title="Копировать ссылку"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleViewStats(link.short_key)}
                            className="stats-btn"
                            title="Подробная статистика"
                          >
                            📊
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/*endless scroll*/}
              {hasMore && (
                <div ref={lastElementRef} className="scroll-trigger">
                  {loading && (
                    <div className="loading-more">
                      <div className="loading-spinner-small"></div>
                      <span>Загрузка ещё ссылок...</span>
                    </div>
                  )}
                </div>
              )}

              {!hasMore && links.length > 0 && (
                <div className="end-message">
                  Вы просмотрели все ссылки ({links.length} шт.)
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-copyright">
          © 2026 Shortly. Все права защищены.
        </div>
      </div>
    </div>
  );
}