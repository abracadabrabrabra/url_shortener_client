import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Link as LinkType } from '../types';
import './DashboardPage.css';

export default function DashboardPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');

  const userEmail = localStorage.getItem('user_email') || 'user@example.com';

  useEffect(() => {
    // TODO: загрузить ссылки с бэкенда
    const mockLinks: LinkType[] = [
      {
        short_key: 'abc123',
        original_url: 'https://example.com/very/long/url',
        short_url: 'http://localhost:8000/abc123',
        user_id: 1,
        clicks_count: 42,
        created_at: new Date().toISOString(),
      },
      {
        short_key: 'def456',
        original_url: 'https://google.com',
        short_url: 'http://localhost:8000/def456',
        user_id: 1,
        clicks_count: 10,
        created_at: new Date().toISOString(),
      },
    ];

    setTimeout(() => {
      setLinks(mockLinks);
      setLoading(false);
    }, 500);
  }, []);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUrl) {
      setError('Пожалуйста, введите URL');
      return;
    }

    try {
      new URL(newUrl);
    } catch {
      setError('Пожалуйста, введите корректный URL (например, https://example.com)');
      return;
    }

    console.log('Create link for:', newUrl);

    const newLink: LinkType = {
      short_key: Math.random().toString(36).substring(2, 8),
      original_url: newUrl,
      short_url: `http://localhost:8000/${Math.random().toString(36).substring(2, 8)}`,
      user_id: 1,
      clicks_count: 0,
      created_at: new Date().toISOString(),
    };

    setLinks([newLink, ...links]);
    setNewUrl('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCopyLink = (shortUrl: string) => {
    navigator.clipboard.writeText(shortUrl);
    alert('Ссылка скопирована в буфер обмена!');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Загрузка ваших ссылок...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Shortly</h1>
            <p className="dashboard-subtitle">Управляйте своими короткими ссылками</p>
          </div>

          {/* avatar & email */}
          <div className="user-info">
            <div className="user-avatar">
              <span className="avatar-initials">
                {userEmail.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="user-details">
              <span className="user-email">{userEmail}</span>
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
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Введите длинную ссылку"
              className="create-link-input"
              required
            />
            <button type="submit" className="create-link-btn">
              Сократить
            </button>
          </form>
        </div>

        <div className="links-section">
          <h2>Мои ссылки</h2>
          {links.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔗</div>
              <p>У вас пока нет созданных ссылок</p>
              <p style={{ fontSize: '14px', color: '#999' }}>
                Создайте первую ссылку с помощью формы выше
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="links-table">
                <thead>
                  <tr>
                    <th>Короткая ссылка</th>
                    <th>Оригинальная ссылка</th>
                    <th>Переходы</th>
                    <th>Дата создания</th>
                    <th></th>
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
                        <button
                          onClick={() => handleCopyLink(link.short_url)}
                          className="copy-btn"
                        >
                          📋 Копировать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}