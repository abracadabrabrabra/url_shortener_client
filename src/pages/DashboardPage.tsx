import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Link as LinkType, UserStats } from '../types';
import './DashboardPage.css';

type CopyToast = {
  type: 'success' | 'error';
  left: number;
  top: number;
} | null;

export default function DashboardPage() {
  const { isAuthenticated, logout, userEmail } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [copyToast, setCopyToast] = useState<CopyToast>(null);
  const [deletingShortKey, setDeletingShortKey] = useState<string | null>(null);
  const [editingShortKey, setEditingShortKey] = useState<string | null>(null);
  const pageSize = 20;
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);

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

  const loadStats = useCallback(async () => {
    try {
      const data = await apiClient.getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load user stats:', error);
      if (error instanceof Error && error.message === 'Unauthorized') {
        navigate('/login');
      }
    }
  }, [navigate]);

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
    loadStats();
    loadLinks(true);
  }, [isAuthenticated, navigate, loadStats]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showCopyToast = (button: HTMLButtonElement, type: 'success' | 'error') => {
    const rect = button.getBoundingClientRect();
    setCopyToast({
      type,
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  };

  const handleCopyLink = async (
    event: React.MouseEvent<HTMLButtonElement>,
    shortUrl: string
  ) => {
    const button = event.currentTarget;

    if (copyStatusTimeoutRef.current) {
      window.clearTimeout(copyStatusTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(shortUrl);
      showCopyToast(button, 'success');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showCopyToast(button, 'error');
    }

    copyStatusTimeoutRef.current = window.setTimeout(() => {
      setCopyToast(null);
    }, 2000);
  };

  const handleViewStats = (shortKey: string) => {
    navigate(`/links/${shortKey}/stats`);
    console.log('View stats for:', shortKey);
  };

  const handleEditShortKey = async (shortKey: string) => {
    const shouldEdit = window.confirm(`Изменить короткую ссылку ${shortKey}? Статистика сохранится.`);
    if (!shouldEdit) return;

    setEditingShortKey(shortKey);

    try {
      const updatedLink = await apiClient.updateShortKey(shortKey);
      setLinks((currentLinks) =>
        currentLinks.map((link) => (link.short_key === shortKey ? updatedLink : link))
      );
    } catch (error) {
      console.error('Failed to update short link:', error);
      alert('Не удалось изменить короткую ссылку. Попробуйте ещё раз.');
    } finally {
      setEditingShortKey(null);
    }
  };

  const handleDeleteLink = async (shortKey: string) => {
    const shouldDelete = window.confirm(`Удалить короткую ссылку ${shortKey}?`);
    if (!shouldDelete) return;

    setDeletingShortKey(shortKey);

    try {
      await apiClient.deleteLink(shortKey);
      setLinks((currentLinks) => currentLinks.filter((link) => link.short_key !== shortKey));
      await loadStats();
    } catch (error) {
      console.error('Failed to delete link:', error);
      alert('Не удалось удалить ссылку. Попробуйте ещё раз.');
    } finally {
      setDeletingShortKey(null);
    }
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
            <button onClick={() => navigate('/links/new')} className="create-link-nav-btn">
              <span className="create-link-plus">+</span>
              Создать ссылку
            </button>
            <div className="user-avatar">
              <span className="avatar-initials">
                {(userEmail || 'U').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="user-details">
              <span className="user-email">{userEmail || 'user@example.com'}</span>
              <button onClick={handleLogout} className="logout-btn" aria-label="Выйти" title="Выйти">
                <svg viewBox="0 0 24 24" className="logout-icon" aria-hidden="true">
                  <path d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card stat-card-blue">
            <div className="stat-main">
              <div className="stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="stat-svg">
                  <path d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
              </div>
              <div>
                <div className="stat-label">Всего ссылок</div>
                <div className="stat-value">{stats ? stats.total_links.toLocaleString('ru-RU') : '—'}</div>
              </div>
            </div>
            <div className="stat-description">Все созданные ссылки</div>
          </div>

          <div className="stat-card stat-card-green">
            <div className="stat-main">
              <div className="stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="stat-svg">
                  <path d="M6 19V12" />
                  <path d="M12 19V8" />
                  <path d="M18 19V5" />
                </svg>
              </div>
              <div>
                <div className="stat-label">Всего кликов</div>
                <div className="stat-value">{stats ? stats.total_clicks.toLocaleString('ru-RU') : '—'}</div>
              </div>
            </div>
            <div className="stat-description">Все переходы по ссылкам</div>
          </div>

          <div className="stat-card stat-card-purple">
            <div className="stat-main">
              <div className="stat-icon">↗</div>
              <div>
                <div className="stat-label">Кликов сегодня</div>
                <div className="stat-value">{stats ? stats.clicks_today.toLocaleString('ru-RU') : '—'}</div>
              </div>
            </div>
            <div className="stat-description">Переходы за сегодня</div>
          </div>

          <div className="stat-card stat-card-orange">
            <div className="stat-main">
              <div className="stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="stat-svg">
                  <path d="M4 16L9 11L13 15L20 8" />
                  <path d="M15 8H20V13" />
                </svg>
              </div>
              <div>
                <div className="stat-label">Кликов за месяц</div>
                <div className="stat-value">{stats ? stats.clicks_this_month.toLocaleString('ru-RU') : '—'}</div>
              </div>
            </div>
            <div className="stat-description">Переходы за месяц</div>
          </div>
        </div>

        <div className="links-section">
          <h2>Мои ссылки</h2>
          {links.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔗</div>
              <p>У вас пока нет созданных ссылок</p>
              <p style={{ fontSize: '14px', color: '#999' }}>
                Создайте первую ссылку на отдельной странице
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
                        <div className="short-link-cell">
                          <a
                            href={link.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="short-link"
                          >
                            {link.short_key}
                          </a>
                          <button
                            onClick={() => handleEditShortKey(link.short_key)}
                            className="edit-short-link-btn"
                            title="Изменить короткую ссылку"
                            disabled={editingShortKey === link.short_key}
                          >
                            {editingShortKey === link.short_key ? '…' : '✎'}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="original-link-scroll">
                          <a href={link.original_url} target="_blank" rel="noopener noreferrer">
                            {link.original_url}
                          </a>
                        </div>
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
                          <div className="copy-action">
                            <button
                              onClick={(event) => handleCopyLink(event, link.short_url)}
                              className="copy-btn"
                              title="Копировать ссылку"
                            >
                              📋
                            </button>
                          </div>
                          <button
                            onClick={() => handleViewStats(link.short_key)}
                            className="stats-btn"
                            title="Подробная статистика"
                          >
                            📊
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.short_key)}
                            className="delete-link-btn"
                            title="Удалить ссылку"
                            disabled={deletingShortKey === link.short_key}
                          >
                            {deletingShortKey === link.short_key ? '…' : '🗑'}
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
      {copyToast && createPortal(
        <div
          className={`copy-status copy-status-floating ${
            copyToast.type === 'error' ? 'copy-status-error' : ''
          }`}
          style={{ left: copyToast.left, top: copyToast.top }}
        >
          {copyToast.type === 'error' ? 'Не скопировано' : 'Скопировано!'}
        </div>,
        document.body
      )}
    </div>
  );
}
