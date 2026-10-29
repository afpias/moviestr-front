# Moviestr

Браузерная игра: угадай фильм по пяти кадрам. Vue 3 + TypeScript — клиент; NestJS + PostgreSQL — отдельный backend.
HTTP `/api/v1` и native WebSocket `/ws` работают на одном origin через nginx.

## Возможности

- Соло без регистрации: пять кадров, RU/EN-поиск, сложность, жанр, победа/поражение, восстановление раунда.
- Комнаты на 2–4 человека с никнеймом, публичностью и необязательным паролем.
- Общий фильм, личные кадры, 1000 на старте, +100/−50, 90 секунд, общий итог.
- HttpOnly гостевая сессия, reconnect и серверные snapshots; две вкладки с одной cookie — один игрок.
- Тема и UI preferences сохраняются локально. Ответы, закрытые кадры и token браузер не хранит.

TMDB, OCR, подготовка кадров, проверка ответа, очки и таймеры выполняются исключительно backend.
Изображения загружаются с публичного CDN TMDB; полного предотвращения внешнего распознавания кадра не обещаем.

## Docker — полный локальный запуск

Репозитории должны лежать рядом:

```text
moviestr/
  moviestr-front/
  moviestr-back/
```

Настройте backend `.env` по его `.env.example`, включая серверный `TMDB_READ_TOKEN`, затем из `moviestr-back`:

```sh
docker compose up --build -d
```

Открыть [localhost:8080](http://localhost:8080). Compose поднимает PostgreSQL, API и frontend.
Frontend image: Node.js 24 build → nginx:80 со статическим `dist`; Vite внутри контейнера не запускается.
nginx проксирует `/api/v1` и `/ws` на `api:3000`, поддерживает WebSocket Upgrade. API не должен попадать в SPA fallback.

В frontend нет секретов, build args с TMDB и runtime server-функций. `.dockerignore` исключает `.env*`,
`.git`, `node_modules`, `dist` и локальные файлы. Не используйте `docker compose down -v` для обычного перезапуска:
это уничтожит данные PostgreSQL.

## Разработка без Docker frontend

Нужны Node.js `^22.18.0 || >=24.12.0`, Yarn Classic 1.22.22 и уже запущенный backend на 127.0.0.1:3000.

```sh
yarn install --frozen-lockfile
yarn dev --host 127.0.0.1 --port 5173 --strictPort
```

Vite dev/preview проксирует `/api/v1` и `/ws` в backend. Укажите origin 5173 в backend ALLOWED_ORIGINS.
Frontend `.env` не требуется; `.env.example` не содержит token. Секреты не добавлять с префиксом VITE_.

### Диагностика TMDB на backend

Сохранённая памятка ниже относится к Node-процессу **backend**, не к frontend. Если системный Windows proxy необходим
для TMDB, задавайте его только backend-процессу либо через документированные backend Docker proxy variables.
Frontend больше не обращается к TMDB API.

#### Windows proxy (исторически проверенный рецепт)

Если API отвечает `502 UPSTREAM_ERROR`, а запрос к TMDB из PowerShell проходит, Node может не использовать системный
прокси Windows. Для Node.js 24 запустите сервер в PowerShell с настройками прокси только для текущего процесса:

```powershell
$configuredProxy = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings').ProxyServer
if ($configuredProxy -match '(^|;)https=([^;]+)') {
    $tmdbProxy = $Matches[2]
} elseif ($configuredProxy -and $configuredProxy -notmatch '=') {
    $tmdbProxy = $configuredProxy
} else {
    throw 'Системный HTTPS-прокси не настроен'
}
if ($tmdbProxy -notmatch '^https?://') { $tmdbProxy = 'http://' + $tmdbProxy }
$env:HTTP_PROXY = $tmdbProxy
$env:HTTPS_PROXY = $tmdbProxy
$env:NODE_USE_ENV_PROXY = '1'
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
yarn dev
```

Проверено на Node.js 24.21.0. Системные настройки не меняются; после закрытия этой PowerShell-сессии переменные исчезнут.
Проверка TLS-сертификатов остаётся включённой. Без настроенного системного прокси этот способ не применяется.

## Hosting / Vercel

Старый frontend адрес: [moviestr-front.vercel.app](https://moviestr-front.vercel.app). Текущий production deploy
не менялся этой миграцией. Самостоятельный статический Vercel deploy теперь требует отдельно выбранного публичного
backend и same-origin reverse proxy для HTTP/WS. Его адрес не выдуман и в `vercel.json` не зашит.
Старый TMDB rewrite удалён; API/WS исключены из SPA fallback. До настройки hosting используйте Docker8080.

## Команды и архитектура

`yarn validate` — типы, ESLint, Vitest и Prettier; `yarn build` — production dist; `yarn test:unit` — клиентские тесты.
Тестовые HTTP fixtures находятся только в testing и не импортируются приложением.

FSD: app → pages → widgets → features → entities → shared. `src/shared/api` — только клиентский transport,
HTTP/WS adapters и DTO validation; root `api/`, `server/`, локальный игровой движок и browser OCR удалены.
Компоненты shadcn-vue используют Tailwind внутри shared/ui, остальные — обычный scoped CSS.

## Git workflow

`main` и `dev` постоянные. `feature/*` / `fix/*` от dev → checks → PR/merge в dev → annotated
`dev/<feature>-<uniquePRorDate>` на merge commit → публикация только этого тега → удаление слитой рабочей ветки.

Релиз обычным merge dev → main с сохранением ancestry → checks → annotated `v<SemVer>` → успешная публикация →
удаление локально и remote только `dev/*`, достижимых из exact version commit. Невошедшие dev-теги, v-теги, main/dev
не удалять. CI различает dev/version tags, но не публикует и не удаляет refs. Merge выполняет владелец.
Принятый владельцем merge/release уже разрешает следующие предусмотренные шаги тегирования и очистки;
повторное разрешение на каждый из этих шагов не требуется, но все проверки и условия сохраняются.

Подробности и ограничения: [Git workflow](docs/git-workflow.md), [AGENTS.md](AGENTS.md).
В текущей задаче remote-операции и production deploy не выполняются.

## Документация и данные

[SDD-пакеты](docs/README.md), [интеграция frontend](docs/backend-integration/frontend-plan.md).
Контракты находятся в соседнем moviestr-back/docs/api: handoff, OpenAPI, WS schemas.

Данные о фильмах и изображения предоставлены TMDB. Проект не одобрен и не сертифицирован TMDB.
Права на изображения принадлежат соответствующим правообладателям.
