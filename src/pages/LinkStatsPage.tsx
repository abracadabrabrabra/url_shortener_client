import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { LinkAnalytics } from '../types';
import './LinkStatsPage.css';

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getMonthTitle = (date: Date) => {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
};

const getCalendarDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekDay = firstDay.getDay() || 7;
  const startDate = new Date(year, month, 2 - firstWeekDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      value: formatDateInput(date),
      isCurrentMonth: date.getMonth() === month,
    };
  });
};

const getDefaultPeriod = () => {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateTo.getDate() - 6);

  return {
    dateFrom: formatDateInput(dateFrom),
    dateTo: formatDateInput(dateTo),
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ru-RU');
};

const formatTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value}%`;

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="analytics-stat-svg" aria-hidden="true">
      <path d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="analytics-stat-svg" aria-hidden="true">
      <path d="M4.5 3.75L19.5 12L12.9 13.65L9.45 20.25L4.5 3.75Z" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="analytics-stat-svg" aria-hidden="true">
      <path d="M6 19V12" />
      <path d="M12 19V8" />
      <path d="M18 19V5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="analytics-stat-svg" aria-hidden="true">
      <path d="M12 6V12L16 14" />
      <path d="M21 12A9 9 0 1 1 3 12A9 9 0 0 1 21 12Z" />
    </svg>
  );
}

function ClicksChart({ data }: { data: LinkAnalytics['daily_clicks'] }) {
  const chartData = data.length ? data : [{ date: '', clicks: 0 }];
  const width = 920;
  const height = 210;
  const padding = { top: 2, right: 22, bottom: 22, left: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxClicks = Math.max(1, ...chartData.map((item) => item.clicks));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxClicks * ratio));

  const points = chartData.map((item, index) => {
    const x = padding.left + (chartData.length === 1 ? innerWidth / 2 : (innerWidth / (chartData.length - 1)) * index);
    const y = padding.top + innerHeight - (item.clicks / maxClicks) * innerHeight;
    const tooltipWidth = 118;
    const tooltipHeight = 38;
    const tooltipX = Math.min(
      width - padding.right - tooltipWidth,
      Math.max(padding.left, x - tooltipWidth / 2)
    );
    const tooltipY = Math.max(padding.top + 6, y - tooltipHeight - 12);

    return { ...item, x, y, tooltipX, tooltipY, tooltipWidth, tooltipHeight };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  return (
    <div className="analytics-chart-scroll">
      <svg className="analytics-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Клики по дням">
        {yTicks.map((tick) => {
          const y = padding.top + innerHeight - (tick / maxClicks) * innerHeight;
          return (
            <g key={`y-${tick}-${y}`}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="chart-grid-line" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" className="chart-axis-text">
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} className="chart-area" />
        <path d={linePath} className="chart-line" />

        {points.map((point) => (
          <g key={point.date || 'empty'} className="chart-point-group">
            <circle cx={point.x} cy={point.y} r="12" className="chart-point-hitbox" />
            <circle cx={point.x} cy={point.y} r="4" className="chart-point" />
            <g className="chart-tooltip" pointerEvents="none">
              <rect
                x={point.tooltipX}
                y={point.tooltipY}
                width={point.tooltipWidth}
                height={point.tooltipHeight}
                className="chart-tooltip-box"
              />
              <text
                x={point.tooltipX + point.tooltipWidth / 2}
                y={point.tooltipY + 15}
                textAnchor="middle"
                className="chart-tooltip-date"
              >
                {point.date ? new Date(point.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '-'}
              </text>
              <text
                x={point.tooltipX + point.tooltipWidth / 2}
                y={point.tooltipY + 30}
                textAnchor="middle"
                className="chart-tooltip-value"
              >
                {point.clicks.toLocaleString('ru-RU')} кликов
              </text>
            </g>
            <text x={point.x} y={height - 2} textAnchor="middle" className="chart-axis-text">
              {point.date ? new Date(point.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '-'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function LinkStatsPage() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const defaultPeriod = useMemo(getDefaultPeriod, []);
  const [dateFrom, setDateFrom] = useState(defaultPeriod.dateFrom);
  const [dateTo, setDateTo] = useState(defaultPeriod.dateTo);
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [pendingDateFrom, setPendingDateFrom] = useState(defaultPeriod.dateFrom);
  const [pendingDateTo, setPendingDateTo] = useState(defaultPeriod.dateTo);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateInput(defaultPeriod.dateTo));
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const loadAnalytics = useCallback(async (nextDateFrom: string, nextDateTo: string) => {
    if (!shortCode) {
      setError('Короткий код не найден');
      return;
    }

    if (!nextDateFrom || !nextDateTo || nextDateFrom > nextDateTo) {
      setError('Укажите корректный период');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await apiClient.getLinkAnalytics(shortCode, nextDateFrom, nextDateTo);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load link analytics:', error);
      if (error instanceof Error && error.message === 'Unauthorized') {
        navigate('/login');
        return;
      }
      setError('Не удалось загрузить статистику по ссылке');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, shortCode]);

  useEffect(() => {
    loadAnalytics(defaultPeriod.dateFrom, defaultPeriod.dateTo);
  }, [defaultPeriod.dateFrom, defaultPeriod.dateTo, loadAnalytics]);

  const handleCopy = async () => {
    if (!analytics) return;

    try {
      await navigator.clipboard.writeText(analytics.short_url);
      setCopyStatus('Скопировано!');
    } catch (error) {
      console.error('Failed to copy analytics link:', error);
      setCopyStatus('Не скопировано');
    }

    window.setTimeout(() => setCopyStatus(''), 2000);
  };

  const handleDownloadReport = () => {
    if (!analytics) return;

    const report = JSON.stringify({ period: { date_from: dateFrom, date_to: dateTo }, analytics }, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `analytics-${analytics.short_key}-${dateFrom}-${dateTo}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleSelectCalendarDate = (value: string) => {
    if (!pendingDateFrom || pendingDateTo) {
      setPendingDateFrom(value);
      setPendingDateTo('');
      return;
    }

    if (value < pendingDateFrom) {
      setPendingDateTo(pendingDateFrom);
      setPendingDateFrom(value);
      return;
    }

    setPendingDateTo(value);
  };

  const handleApplyPeriod = () => {
    if (!pendingDateFrom || !pendingDateTo) {
      setError('Выберите начало и конец периода');
      return;
    }

    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setIsPeriodPickerOpen(false);
    loadAnalytics(pendingDateFrom, pendingDateTo);
  };

  const handleResetPendingPeriod = () => {
    setPendingDateFrom(dateFrom);
    setPendingDateTo(dateTo);
    setCalendarMonth(parseDateInput(dateTo));
  };

  return (
    <div className="analytics-page-container">
      <div className="analytics-card">
        <header className="analytics-topbar">
          <div className="analytics-brand">
            <span className="analytics-logo" aria-hidden="true"><PaperclipIcon /></span>
            <span>Shortly</span>
          </div>
          <button onClick={() => navigate('/dashboard')} className="analytics-back-btn">
            ← Назад к моим ссылкам
          </button>
        </header>

        <main className="analytics-content">
          <div className="analytics-heading-row">
            <div>
              <h1 className="analytics-title">Статистика по ссылке</h1>
              {analytics && (
                <div className="analytics-link-box">
                  <div className="analytics-short-row">
                    <a href={analytics.short_url} target="_blank" rel="noopener noreferrer">
                      {analytics.short_url}
                    </a>
                    <button onClick={handleCopy} className="analytics-copy-btn" title="Копировать ссылку">
                      ⧉
                    </button>
                    {copyStatus && <span className="analytics-copy-status">{copyStatus}</span>}
                  </div>
                  <div className="analytics-original-link">{analytics.original_url}</div>
                </div>
              )}
            </div>

            <div className="analytics-controls">
              <div className="analytics-period-picker">
                <button
                  type="button"
                  onClick={() => {
                    handleResetPendingPeriod();
                    setIsPeriodPickerOpen((isOpen) => !isOpen);
                  }}
                  className="analytics-period-btn"
                >
                  <svg viewBox="0 0 24 24" className="analytics-period-icon" aria-hidden="true">
                    <path d="M7 3V6" />
                    <path d="M17 3V6" />
                    <path d="M4 9H20" />
                    <path d="M6 5H18A2 2 0 0 1 20 7V19A2 2 0 0 1 18 21H6A2 2 0 0 1 4 19V7A2 2 0 0 1 6 5Z" />
                  </svg>
                  {formatDate(dateFrom)} - {formatDate(dateTo)}
                  <span className="analytics-period-chevron">⌄</span>
                </button>

                {isPeriodPickerOpen && (
                  <div className="analytics-calendar-popover">
                    <div className="analytics-calendar-header">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                        className="analytics-calendar-nav"
                      >
                        ‹
                      </button>
                      <span>{getMonthTitle(calendarMonth)}</span>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                        className="analytics-calendar-nav"
                      >
                        ›
                      </button>
                    </div>

                    <div className="analytics-calendar-weekdays">
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>

                    <div className="analytics-calendar-grid">
                      {calendarDays.map((day) => {
                        const isStart = day.value === pendingDateFrom;
                        const isEnd = day.value === pendingDateTo;
                        const isInRange = Boolean(
                          pendingDateFrom &&
                          pendingDateTo &&
                          day.value > pendingDateFrom &&
                          day.value < pendingDateTo
                        );

                        return (
                          <button
                            type="button"
                            key={day.value}
                            onClick={() => handleSelectCalendarDate(day.value)}
                            className={`analytics-calendar-day ${
                              day.isCurrentMonth ? '' : 'analytics-calendar-day-muted'
                            } ${isStart || isEnd ? 'analytics-calendar-day-selected' : ''} ${
                              isInRange ? 'analytics-calendar-day-range' : ''
                            }`}
                          >
                            {day.date.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    <div className="analytics-calendar-footer">
                      <span>{pendingDateFrom ? formatDate(pendingDateFrom) : 'Начало'} - {pendingDateTo ? formatDate(pendingDateTo) : 'Конец'}</span>
                      <button type="button" onClick={handleApplyPeriod} className="analytics-calendar-apply">
                        Применить
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleDownloadReport} className="analytics-download-btn" disabled={!analytics}>
                Скачать отчёт
              </button>
            </div>
          </div>

          {error && <div className="analytics-error">{error}</div>}
          {isLoading && <div className="analytics-state">Загрузка статистики...</div>}

          {analytics && !isLoading && (
            <>
              <section className="analytics-stats-grid">
                <div className="analytics-stat-card analytics-stat-blue">
                  <div className="analytics-stat-main">
                    <div className="analytics-stat-icon"><PaperclipIcon /></div>
                    <div>
                      <div className="analytics-stat-label">Всего кликов</div>
                      <div className="analytics-stat-value">{analytics.total_clicks.toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                  <div className="analytics-stat-description">
                    {formatPercent(analytics.comparison.total_clicks_percent)} по сравнению с предыдущим периодом
                  </div>
                </div>

                <div className="analytics-stat-card analytics-stat-purple">
                  <div className="analytics-stat-main">
                    <div className="analytics-stat-icon"><CursorIcon /></div>
                    <div>
                      <div className="analytics-stat-label">Уникальные клики</div>
                      <div className="analytics-stat-value">{analytics.unique_clicks.toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                  <div className="analytics-stat-description">
                    {formatPercent(analytics.comparison.unique_clicks_percent)} по сравнению с предыдущим периодом
                  </div>
                </div>

                <div className="analytics-stat-card analytics-stat-green">
                  <div className="analytics-stat-main">
                    <div className="analytics-stat-icon"><BarsIcon /></div>
                    <div>
                      <div className="analytics-stat-label">Среднее в день</div>
                      <div className="analytics-stat-value">{analytics.average_per_day.toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                  <div className="analytics-stat-description">
                    {formatPercent(analytics.comparison.average_per_day_percent)} по сравнению с предыдущим периодом
                  </div>
                </div>

                <div className="analytics-stat-card analytics-stat-orange">
                  <div className="analytics-stat-main">
                    <div className="analytics-stat-icon"><ClockIcon /></div>
                    <div>
                      <div className="analytics-stat-label">Последний клик</div>
                      <div className="analytics-stat-value analytics-last-click">{formatDate(analytics.last_click_at)}</div>
                    </div>
                  </div>
                  <div className="analytics-stat-description analytics-stat-muted">{formatTime(analytics.last_click_at)}</div>
                </div>
              </section>

              <section className="analytics-chart-panel">
                <div className="analytics-chart-header">
                  <h2>Клики по дням</h2>
                  <div className="analytics-chart-meta">
                    <span>{analytics.daily_clicks.length} дней в периоде</span>
                    <span className={`analytics-status-badge ${analytics.is_active ? 'analytics-status-active' : 'analytics-status-inactive'}`}>
                      {analytics.is_active ? 'Активна' : 'Не активна'}
                    </span>
                  </div>
                </div>
                <ClicksChart data={analytics.daily_clicks} />
              </section>
            </>
          )}
        </main>

        <footer className="analytics-footer">© 2026 Shortly. Все права защищены.</footer>
      </div>
    </div>
  );
}
