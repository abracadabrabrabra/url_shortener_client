# Shortly Client

Frontend для сервиса сокращения ссылок Shortly. Приложение позволяет регистрироваться и входить в аккаунт, создавать короткие ссылки, копировать результат, получать QR-код, настраивать QR-код, смотреть список своих ссылок и подробную статистику переходов.

## Стек

- React 19
- TypeScript
- Vite
- React Router
- ESLint
- CSS без UI-библиотек

## Требования

- Node.js 22+
- npm 10+
- Запущенный backend API

Текущие проверенные версии в окружении разработки:

```bash
node -v
# v22.22.3

npm -v
# 10.9.8
```

## Запуск

1. Установить зависимости:

```bash
npm install
```

### Dev-режим через Vite

Запустить frontend dev-server:

```bash
npm run dev
```

Открыть адрес, который покажет Vite, обычно:

```txt
http://localhost:5173
```

В этом режиме frontend работает через Vite, а API-запросы идут на backend из `VITE_API_URL`.

### Локальный запуск через nginx

Собрать frontend:

```bash
npm run build
```

После настройки nginx приложение открывается по адресу nginx, например:

```txt
http://localhost
```

или на порту, который указан в nginx:

```txt
http://localhost:8080
```

В этом режиме nginx отдаёт собранный `dist/`, а запросы `/api/...` и `/r/...` проксирует на backend.

## Скрипты

```bash
npm run dev
```

Запуск dev-сервера Vite.

```bash
npm run build
```

TypeScript-проверка и production-сборка в `dist/`.

```bash
npm run preview
```

Локальный preview production-сборки.

```bash
npm run lint
```

Проверка ESLint.

## Переменные окружения

### `VITE_API_URL`

Базовый URL backend API.

Примеры:

```env
VITE_API_URL=http://localhost:8000
```

```env
VITE_API_URL=https://shortly.example.com
```

Все запросы из `src/api/client.ts` строятся относительно этого значения.

## Frontend-маршруты

Основные маршруты описаны в `src/App.tsx`.

| Route | Доступ | Назначение |
| --- | --- | --- |
| `/login` | public | Страница входа |
| `/register` | public | Страница регистрации |
| `/forgot-password` | public | Восстановление пароля |
| `/terms` | public | Условия использования, заглушка |
| `/privacy` | public | Политика конфиденциальности, заглушка |
| `/` | protected | Редирект на `/dashboard` |
| `/dashboard` | protected | Дашборд пользователя со статистикой и таблицей ссылок |
| `/links/new` | protected | Создание новой короткой ссылки |
| `/links/:shortCode/result` | protected | Результат создания ссылки, QR-код и действия |
| `/links/:shortCode/stats` | protected | Подробная аналитика по ссылке |
| `*` | public | 404 |

Protected routes требуют access token. Если пользователь не авторизован, `ProtectedRoute` отправляет на `/login`.

## Backend API, которые использует frontend

Все вызовы централизованы в `src/api/client.ts`.

### Auth

| Method | Endpoint | Назначение |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Регистрация |
| `POST` | `/api/auth/login` | Вход, form-urlencoded |
| `POST` | `/api/auth/refresh` | Обновление access token |
| `POST` | `/api/auth/logout` | Выход с текущим refresh token |
| `POST` | `/api/auth/logout-all` | Выход со всех устройств |
| `POST` | `/api/auth/forgot-password` | Запрос восстановления пароля |
| `POST` | `/api/auth/reset-password` | Сброс пароля по коду |

### Links

| Method | Endpoint | Назначение |
| --- | --- | --- |
| `POST` | `/api/shorten/protected` | Создание ссылки авторизованным пользователем |
| `POST` | `/shorten` | Создание публичной ссылки, если используется |
| `GET` | `/api/user/links?skip=&limit=&include_inactive=` | Список ссылок пользователя |
| `GET` | `/api/user/stats` | Общая статистика пользователя |
| `GET` | `/api/links/{shortKey}/stats` | Базовая статистика ссылки |
| `GET` | `/api/links/{shortKey}/analytics?date_from=&date_to=` | Подробная аналитика за период |
| `PATCH` | `/api/links/{shortKey}` | Изменение короткого кода ссылки с сохранением статистики |
| `DELETE` | `/api/links/{shortKey}` | Деактивация/удаление ссылки |

### QR

| Method | Endpoint | Назначение |
| --- | --- | --- |
| `GET` | `/api/qr/{shortKey}?scale=` | Получение QR-кода |
| `POST` | `/api/qr/{shortKey}/custom` | Генерация кастомного QR-кода через `multipart/form-data` |

Для кастомного QR frontend отправляет:

- `dark_color`
- `light_color`
- `scale`
- `use_default_logo=false`
- `logo_file`, если пользователь загрузил изображение

## Формат короткой ссылки

Backend redirect теперь использует формат:

```txt
/r/{shortKey}
```

Frontend использует `short_url` из ответа backend. Если backend не прислал `short_url`, клиент собирает fallback-ссылку сам в `buildShortUrl()`:

```txt
{VITE_API_URL}/r/{shortKey}
```

Это важно для nginx: `/r/...` должен уходить на backend redirect, а frontend routes должны отдавать `index.html`.

## Основные файлы проекта

```txt
src/main.tsx
```

Точка входа React-приложения. Подключает `AuthProvider`, `App` и глобальные стили.

```txt
src/App.tsx
```

Описание frontend routes.

```txt
src/api/client.ts
```

Единый API-клиент. Отвечает за:

- добавление `Authorization: Bearer ...`;
- refresh token при `401`;
- auth-запросы;
- работу со ссылками;
- QR-запросы;
- нормализацию `short_url`.

```txt
src/context/AuthContext.tsx
```

Контекст авторизации. Хранит состояние пользователя, токены и методы login/register/logout.

```txt
src/components/ProtectedRoute.tsx
```

Защита приватных страниц.

```txt
src/pages/LoginPage.tsx
src/pages/RegisterPage.tsx
src/pages/ForgotPasswordPage.tsx
```

Auth-страницы.

```txt
src/pages/DashboardPage.tsx
```

Дашборд пользователя: карточки статистики, таблица ссылок, копирование, редактирование short key, удаление, переход к аналитике.

```txt
src/pages/CreateLinkPage.tsx
```

Страница создания ссылки. Валидирует URL на клиенте и показывает понятные ошибки backend validation.

```txt
src/pages/LinkResultPage.tsx
```

Страница результата создания ссылки: короткая ссылка, копирование, QR-код, скачивание QR, настройка QR и share-действия.

```txt
src/pages/LinkStatsPage.tsx
```

Подробная аналитика ссылки: период, карточки метрик, график кликов по дням, tooltip на точках.

```txt
src/types/index.ts
```

Основные TypeScript-типы: `User`, `Link`, `UserStats`, `LinkAnalytics`.

```txt
src/index.css
```

Глобальные стили и CSS-переменные для общего shell/layout.

## Сборка для production

```bash
npm run build
```

Результат появится в:

```txt
dist/
```

Для nginx обычно нужно отдавать `dist/index.html` и `dist/assets/*` как static files.

Пример логики nginx:

```txt
/api/...  -> backend
/r/...    -> backend redirect
/assets/* -> static files from dist/assets
/*        -> dist/index.html
```

## Важные замечания

- `VITE_API_URL` должен указывать на публичный backend/base URL, который доступен из браузера.
- После изменения `.env` нужно перезапустить dev-сервер или пересобрать production build.
- Access token хранится в `localStorage` как `access_token`, refresh token как `refresh_token`.
