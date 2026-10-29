# Проверка frontend → NestJS / Docker

Дата: 28 октября 2026. Scope: полная миграция frontend, Docker и Git-правила; backend/Compose собирал отдельный
существующий исполнитель. Коммит, push, PR, merge, публикация/удаление тегов и production deploy не выполнялись.

## Результат

- Приложение: [localhost:8080](http://localhost:8080), nginx frontend + NestJS API + PostgreSQL, все три контейнера healthy.
- Проверенный frontend image: `sha256:d4375ae40397ff87e814481e6b5337030300d7f70fc7d2f6c934f63cf9b4b69c`.
- `yarn validate`: **PASS**, 21 test file / **74 tests**; TypeScript, ESLint и Prettier успешны.
- `yarn build`: **PASS**. Старые TMDB/OCR chunks отсутствуют в новой сборке.
- `nginx -t`: **PASS**. `/` и `/lobby` — 200 HTML; неизвестный `/api/v1/...` — 404 JSON, не SPA fallback.
- Docker browser E2E: **PASS**, exit 0, настоящий Microsoft Edge / Playwright 1.62.1, без mock API.
- Перед миграцией было 112 frontend-тестов, включая локальную серверную реализацию. Её тесты удалены вместе с runtime;
  теперь 74 клиентских теста, backend проверяется в своём репозитории. Это не заявка на прежний backend coverage во Vue.
- Остаются три существующих ESLint warning `import/no-default-export` (router, vite, vitest config) и предупреждение
  пакета форматирования об неизвестном `importOrder: undefined`. Правила не ослаблялись.

## Что изменено

Frontend использует same-origin `/api/v1` с `credentials: include`, асинхронную HttpOnly guest cookie и native `/ws`.
POST games → 202 → polling, ID/frame/round guards, Idempotency-Key для повторов одной команды, strict unknown DTO
validation, versioned персональные snapshots, restore attempts, scoped одноразовые tickets и reconnect/resync.
Часы в UI только отображают server deadline, а не двигают матч. Preview до join не содержит players/host/кадров.

Удалены root `api/` и `server/`, local game-session, multiplayer demo engine/adapters/schema, browser TMDB catalog,
OCR, ranking/title matching и соответствующие серверные тесты. `src/shared/api` остаётся клиентским transport.
`tesseract.js` удалён через Yarn. UI labels, difficulty navigation, темы и настройки сохранены.

Dockerfile: Node 24 build → nginx:80. nginx передаёт HTTP и WebSocket Upgrade на `api:3000`, buffering отключён,
timeout 90 секунд больше heartbeat. `.env*` не входят в image context; frontend не получает TMDB build arg/token.
Vite dev/preview proxy идёт на `127.0.0.1:3000`. Старый Vercel TMDB rewrite удалён без выдуманного production URL.

README, AGENTS и [Git workflow](../git-workflow.md) согласованы: постоянные main/dev, PR в dev, annotated уникальный
dev tag на merge commit, публикация только этого тега и удаление слитой ветки. Release обычным merge dev → main,
annotated vSemVer, успешные release checks/весь процесс публикации, затем только dev tags из ancestry exact version commit.
CI различает dev/version tags, но не выполняет release automation. Принятый merge/release разрешает весь описанный хвост,
не требует подтверждения каждого шага. В текущей задаче эти операции не запускались.

## Проверенные браузерные сценарии

Два независимых browser contexts, а не две вкладки с общей cookie. Настоящие HTTP/WS и TMDB/CDN.
Для выбора гарантированно верного варианта только тестовый Node-процесс читал подготовленный фильм read-only SELECT
из PostgreSQL. Ни app, ни браузер не имеют этого oracle: ответ не извлекался из frontend storage или active Network.
SQL не менял/не seed-ил данные. Игры и комнаты создавались через пользовательский UI.

1. Автостарт соло, HttpOnly cookie, фактически загруженный кадр; поиск RU/EN и выдача над input.
2. Неверный ответ → следующий кадр; refresh восстанавливает тот же gameId, кадр и attempted IDs с backend.
3. Правильный выбранный ID → победа и полный постер; Next → Medium. Пять кадров, surrender и retry той же сложности.
4. Viewport 360 px: `scrollWidth <= innerWidth`, local difficulty scrolling, UI без горизонтального растяжения страницы.
5. Создание комнаты на четыре места с паролем и двумя фильмами; независимый второй гость видит только safe preview.
   Неверный пароль даёт ожидаемый 403 WRONG_PASSWORD; верный позволяет join. Старт при двух room subscriptions.
6. Один фильм для обоих; ошибка гостя −50 и только его второй кадр, хост остаётся на первом.
7. Offline + закрытие реального native socket, затем online: fresh ticket и полный snapshot восстанавливают личный кадр.
   Эмуляция offline сама по себе не закрывает уже открытый WebSocket в Edge, поэтому сокет закрывает test driver.
8. Хост угадывает +100 и ждёт; гость сдаётся −50. После завершения обоими синхронно начинается второй фильм.
9. Полный матч завершён, обе стороны видят один результат: **DockerHost 1200, DockerGuest 1000**.
10. После удаления guest cookie у гостя и закрытия WS первый ticket-запрос даёт ожидаемый 401 SESSION_REQUIRED.
    Клиент создаёт новую guest session, показывает safe preview и предложение войти заново, скрывает старые players/score.
    Число игровых mutations не увеличивается: исходная команда не повторяется от новой личности.

Итог последнего прогона: `errors: []`, `violations: []`, **64** активных HTTP/WS snapshots проверены;
ожидаемые негативные HTTP — только WRONG_PASSWORD 403 и SESSION_REQUIRED 401. Cookie недоступна document.cookie.
В browser storage нет demo registry/полной сессии/ответов/aliases/будущих frames. **12 JS assets** dist проверены
на реальный backend token (значение не выводилось), старый runtime и TMDB API client. Token и секретные env отсутствуют
в frontend container; runtime не содержит `/app`, root API/server или `.env` в document root.

## Четыре замечания ревью

Все воспроизведены RED-тестами и исправлены, повторное независимое ревью подтвердило fixes:

- Auth failure HTTP401 / WS session error / 4401 инвалидирует guest cache. Контролируемый bootstrap обновляет identity;
  mutations от новой личности автоматически не исполняются.
- Устаревший connect после GET/stop не создаёт interval и не оставляет подписку; generation проверяется после await.
- Initial bootstrap/GET network failure получает управляемый retry, отличается от not-found и восстанавливается без reload.
- Поздний resync/command игры A не перезаписывает игру B и её persistence; guard захватывает generation и gameId.

## Очистка

Сохранены исходные полезные правки README про Windows proxy (теперь явно про backend), пути проекта и mobile min-width.
Frontend `.env` с устаревшими TMDB_READ_TOKEN/VITE_ENABLE_MOCKS удалён после проверки backend `tmdbConfigured: true`.
Token остаётся на backend; `.env.local` с существующим Vercel OIDC credential не тронут. Значения секретов не выводились.
Legacy demo/session keys очищаются адресно; тема и UI preferences не удаляются.

После перечисления и проверки resolved paths внутри frontend удалены только физически пустые каталоги, без `-Recurse`:

- `api`, `server/__tests__`, `server`;
- `src/shared/api/multiplayer/__tests__`, `src/shared/api/tmdb/__tests__`, `src/shared/api/tmdb`;
- `docs/pr-review`, `scripts/pr-review/__tests__`, `scripts/pr-review`, `scripts`, `public`.

Повторный обход разрешённых source/docs targets пустых папок не обнаружил. `.git`, node_modules и caches исключены.
Удалённые tracked исходники восстанавливаемы через Git; пустые каталоги можно создать заново, данных в них не было.
Backend volumes и данные не удалялись. Во всех shell-вызовах явно использован новый frontend workdir;
старый cwd метаданных чата `Projects/vue` доступными инструментами не меняется.

## Артефакты

Скриншоты визуально просмотрены:

- [Соло desktop](./artifacts/docker-solo.png)
- [Победа и постер](./artifacts/docker-solo-victory.png)
- [Mobile 360 px](./artifacts/docker-mobile-360.png)
- [Итог сетевого матча](./artifacts/docker-match-finished.png)

Локальный исполняемый test driver сохранён в
`C:/Users/nikip/.codex/visualizations/2026/10/10/01a1265e-ef41-7713-a6cf-95e5ce29fa78/frontend-docker-e2e.mjs`.
Он использует установленный Playwright/Edge, локальные пути и read-only DB oracle, не включён в production image.
Промежуточные неуспешные screenshots и первый smoke до миграции сохранены там отдельно; они не выдаются за финальный результат.

## Не выполнено / ограничения

- Физические устройства/LAN, 3–4 игрока, production hosting/TLS/domain, staging и production cutover не проверялись.
- Browser E2E этой задачи не проверяет полный 90-секундный timeout, 30-секундный host transfer, backend restart,
  DB crash/recovery и TMDB outage. Соответствующие backend tests/проверки ведутся в отдельном репозитории.
- Нет гарантированного semantic actor recognition и идеального OCR; это backend limitations, browser OCR не возвращён.
- Существующий favicon 404 не влияет на игру, в этой миграции не исправлялся.
- GitHub CI изменения проверены локально (validate/build и YAML), remote workflows/branch policy и release/tag cleanup
  не запускались и не объявляются проверенными на GitHub.
