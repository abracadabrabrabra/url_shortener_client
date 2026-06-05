import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Link } from '../types';
import './LinkResultPage.css';

interface CreatedLinkState {
  link?: {
    original_url: string;
    short_code: string;
    short_url: string;
  };
}

export default function LinkResultPage() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const { logout, userEmail } = useAuth();
  const location = useLocation();
  const state = location.state as CreatedLinkState | null;
  const link: Link | null = (() => {
    if (!state?.link) return null;

    return {
      short_key: state.link.short_code,
      original_url: state.link.original_url,
      short_url: state.link.short_url,
      user_id: null,
    };
  })();
  const [error, setError] = useState(
    state?.link ? '' : 'Результат создания ссылки не найден. Создайте ссылку заново.'
  );
  const [copyStatus, setCopyStatus] = useState('');
  const [isQrSettingsOpen, setIsQrSettingsOpen] = useState(false);
  const [darkColor, setDarkColor] = useState('#202642');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [qrScale, setQrScale] = useState('10');
  const [appliedQrScale, setAppliedQrScale] = useState(10);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [customQrUrl, setCustomQrUrl] = useState('');
  const [customQrBlob, setCustomQrBlob] = useState<Blob | null>(null);
  const [qrStatus, setQrStatus] = useState('');
  const [isQrGenerating, setIsQrGenerating] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  const qrUrl = useMemo(() => {
    return shortCode ? apiClient.getQrCodeUrl(shortCode, 10) : '';
  }, [shortCode]);
  const qrPreviewUrl = customQrUrl || qrUrl;
  const qrPreviewSize = Math.min(158, Math.max(120, appliedQrScale * 4 + 118));

  useEffect(() => {
    return () => {
      if (customQrUrl) {
        URL.revokeObjectURL(customQrUrl);
      }
    };
  }, [customQrUrl]);

  const handleCopy = async () => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link.short_url);
      setCopyStatus('Скопировано!');
    } catch (error) {
      console.error('Failed to copy short link:', error);
      setCopyStatus('Не скопировано');
    }

    window.setTimeout(() => setCopyStatus(''), 2000);
  };

  const handleDownloadQr = async () => {
    if (!shortCode || !qrPreviewUrl) return;

    try {
      let blob = customQrBlob;
      if (!blob) {
        const response = await fetch(qrPreviewUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        blob = await response.blob();
      }
      const objectUrl = URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.href = objectUrl;
      linkElement.download = `qr-${shortCode}.png`;
      document.body.appendChild(linkElement);
      linkElement.click();
      linkElement.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      setError('Не удалось скачать QR-код');
    }
  };

  const handleGenerateCustomQr = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shortCode) return;

    setIsQrGenerating(true);
    setQrStatus('');
    setError('');

    const parsedScale = Number(qrScale);
    if (!Number.isInteger(parsedScale) || parsedScale < 3 || parsedScale > 20) {
      setQrStatus('Scale должен быть числом от 3 до 20');
      setIsQrGenerating(false);
      return;
    }

    try {
      const blob = await apiClient.createCustomQr(shortCode, {
        darkColor,
        lightColor,
        scale: parsedScale,
        logoFile,
      });
      const nextUrl = URL.createObjectURL(blob);
      setCustomQrUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return nextUrl;
      });
      setCustomQrBlob(blob);
      setAppliedQrScale(parsedScale);
      setQrStatus('QR-код обновлён');
    } catch (error) {
      console.error('Failed to generate custom QR code:', error);
      setQrStatus('Не удалось настроить QR-код');
    } finally {
      setIsQrGenerating(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getShareUrls = () => {
    if (!link) return { vk: '', telegram: '' };
    const encodedUrl = encodeURIComponent(link.short_url);
    const encodedText = encodeURIComponent('Короткая ссылка');

    return {
      vk: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedText}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    };
  };

  const shareUrls = getShareUrls();

  return (
    <div className="result-page-container">
      <div className="result-page-card">
        <div className="result-dashboard-header">
          <div>
            <h1 className="result-dashboard-title">Shortly</h1>
            <p className="result-dashboard-subtitle">Готовая короткая ссылка и QR-код</p>
          </div>

          <div className="result-user-info">
            <div className="result-user-avatar">
              <span className="result-avatar-initials">
                {(userEmail || 'U').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="result-user-details">
              <button onClick={() => navigate('/dashboard')} className="result-user-email">
                {userEmail || 'user@example.com'}
              </button>
              <button onClick={handleLogout} className="result-logout-btn" aria-label="Выйти" title="Выйти">
                <svg viewBox="0 0 24 24" className="result-logout-icon" aria-hidden="true">
                  <path d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <main className="result-page-content">
          {error && <div className="result-error">{error}</div>}

          {link && (
            <section className="result-ready-panel">
              <div className="result-success-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>

              <h1 className="result-page-title">Ваша ссылка готова!</h1>
              <p className="result-page-subtitle">
                Скопируйте короткую ссылку или отсканируйте QR-код
              </p>

              <div className="result-copy-panel">
                <a href={link.short_url} target="_blank" rel="noopener noreferrer" className="short-result-link">
                  {link.short_url}
                </a>
                <button onClick={handleCopy} className="result-primary-btn">
                  <svg viewBox="0 0 24 24" className="result-btn-icon" aria-hidden="true">
                    <path d="M8 8H6A2 2 0 0 0 4 10V18A2 2 0 0 0 6 20H14A2 2 0 0 0 16 18V16" />
                    <path d="M10 4H18A2 2 0 0 1 20 6V14A2 2 0 0 1 18 16H10A2 2 0 0 1 8 14V6A2 2 0 0 1 10 4Z" />
                  </svg>
                  Копировать
                </button>
                {copyStatus && <span className="result-copy-status">{copyStatus}</span>}
              </div>

              <div className={`result-qr-settings-row ${isQrSettingsOpen ? 'result-qr-settings-row-open' : ''}`}>
                <div className="qr-preview">
                  <img
                    src={qrPreviewUrl}
                    alt={`QR-код для ${link.short_url}`}
                    style={{ width: `${qrPreviewSize}px`, height: `${qrPreviewSize}px` }}
                  />
                </div>

                {isQrSettingsOpen && (
                  <form onSubmit={handleGenerateCustomQr} className="qr-settings-panel">
                    <div>
                      <h2 className="qr-settings-title">Настройка QR-кода</h2>
                      {/*<p className="qr-settings-subtitle">*/}
                      {/*  Цвета, размер и изображение для центра QR-кода.*/}
                      {/*</p>*/}
                    </div>

                    <div className="qr-settings-grid">
                      <label className="qr-field">
                        <span>Цвет QR-кода</span>
                        <input
                          type="color"
                          value={darkColor}
                          onChange={(event) => setDarkColor(event.target.value)}
                        />
                      </label>

                      <label className="qr-field">
                        <span>Цвет фона</span>
                        <input
                          type="color"
                          value={lightColor}
                          onChange={(event) => setLightColor(event.target.value)}
                        />
                      </label>

                      <label className="qr-field">
                        <span>Размер</span>
                        <input
                          type="number"
                          min="3"
                          max="20"
                          value={qrScale}
                          onChange={(event) => setQrScale(event.target.value)}
                        />
                      </label>

                      <div className="qr-file-control">
                        <label className="qr-file-field">
                          <span>{logoFile ? logoFile.name : 'Загрузить изображение'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                          />
                        </label>
                        {logoFile && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="qr-file-remove"
                            aria-label="Удалить изображение"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="qr-settings-footer">
                      {qrStatus && <span className="qr-status">{qrStatus}</span>}
                      <button type="submit" className="result-primary-btn" disabled={isQrGenerating}>
                        {isQrGenerating ? 'Генерация...' : 'Применить'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="result-actions-row">
                <button onClick={handleDownloadQr} className="result-secondary-btn">
                  <svg viewBox="0 0 24 24" className="result-btn-icon" aria-hidden="true">
                    <path d="M12 3V15" />
                    <path d="M7 10L12 15L17 10" />
                    <path d="M5 21H19" />
                  </svg>
                  Скачать QR-код
                </button>
                <button
                  onClick={() => setIsQrSettingsOpen((isOpen) => !isOpen)}
                  className="result-secondary-btn"
                >
                  <svg viewBox="0 0 24 24" className="result-btn-icon" aria-hidden="true">
                    <path d="M16.862 4.487L19.513 7.138M5 19L8.5 18.3L19.028 7.772A1.875 1.875 0 0 0 16.228 4.972L5.7 15.5L5 19Z" />
                  </svg>
                  Настроить QR-код
                </button>
                {isShareMenuOpen ? (
                  <div className="result-share-inline" aria-label="Поделиться ссылкой">
                    <a
                      href={shareUrls.vk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-share-icon-link result-share-vk"
                      aria-label="Поделиться во VK"
                      title="VK"
                    >
                      VK
                    </a>
                    <a
                      href={shareUrls.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-share-icon-link"
                      aria-label="Поделиться в Telegram"
                      title="Telegram"
                    >
                      <svg viewBox="0 0 24 24" className="result-share-svg" aria-hidden="true">
                        <path d="M21 4L3 11.3L10 13.6M21 4L17.7 20L10 13.6M21 4L10 13.6M10 13.6L10.8 19L13.6 15.7" />
                      </svg>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsShareMenuOpen(false)}
                      className="result-share-icon-link"
                      aria-label="Закрыть варианты поделиться"
                      title="Закрыть"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsShareMenuOpen(true)} className="result-secondary-btn">
                    <svg viewBox="0 0 24 24" className="result-btn-icon" aria-hidden="true">
                      <path d="M18 8A3 3 0 1 0 15 5A3 3 0 0 0 18 8Z" />
                      <path d="M6 15A3 3 0 1 0 3 12A3 3 0 0 0 6 15Z" />
                      <path d="M18 22A3 3 0 1 0 15 19A3 3 0 0 0 18 22Z" />
                      <path d="M8.7 13.4L15.3 17.6" />
                      <path d="M15.3 6.4L8.7 10.6" />
                    </svg>
                    Поделиться
                  </button>
                )}
              </div>

              <div className="result-action-divider" />

              <button onClick={() => navigate('/links/new')} className="result-another-btn">
                <span className="result-plus-icon">+</span>
                Сократить ещё одну ссылку
              </button>
            </section>
          )}
        </main>

        <div className="result-page-footer">
          © 2026 Shortly. Все права защищены.
        </div>
      </div>
    </div>
  );
}
