import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Страница не найдена</h1>
        <p className="not-found-message">
          Извините, страница, которую вы ищете, не существует или была перемещена.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="not-found-btn not-found-btn-primary">
            На главную
          </Link>
          <Link to="/dashboard" className="not-found-btn not-found-btn-secondary">
            Перейти в дашборд
          </Link>
        </div>
        <div className="not-found-links">
          <p>Возможно, вас заинтересуют эти страницы:</p>
          <ul>
            <li><Link to="/login">Вход в аккаунт</Link></li>
            <li><Link to="/register">Регистрация</Link></li>
            <li><Link to="/dashboard">Дашборд</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}