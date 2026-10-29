# Подключение frontend к NestJS — план реализации

**Goal:** удалить серверную реализацию из Vue и подключить готовый API без редизайна игры.
**Architecture:** same-origin HTTP `/api/v1`, HttpOnly guest cookie, native WS `/ws` с одноразовыми scoped tickets.
Сервер определяет фильм, кадры, очки, deadlines и переходы; Pinia хранит только последние проверенные snapshots.
**Tech Stack:** Vue 3, TypeScript, Pinia, fetch/WebSocket, Vitest; Node 24 build → nginx runtime.
**Spec:** SPEC-009; актуальный контракт — соседний `moviestr-back/docs/api/handoff.md`, OpenAPI и WS schema 0.1.0.

## Решения и границы

Владелец явно разрешил полный этап интеграции, Docker и обновление Git-правил 28 октября 2026.
Выбран прямой сетевой клиент: сохранять локальный игровой движок нельзя; промежуточный mock-адаптер не нужен.
Существующие UI и настройки сохраняются. Авторизация без аккаунтов, две вкладки с общей cookie — один игрок.
Backend и его compose меняет другой существующий исполнитель. На этапе фиксации 29 октября владелец разрешил локальный
коммит накопленных изменений и подготовку версии 0.1.0. Этот исполнитель не делает push/PR/merge/tag и не удаляет ветки:
эти действия выполняет координатор. Не создавать дополнительных агентов. Изменения README, путей и mobile CSS сохранить.

## Особые риски проверки

1. Потерянный HTTP-ответ не должен повторно снимать очки: один Idempotency-Key для повторов одинаковой команды.
2. HTTP и WS могут прийти в разном порядке: старые/equal versions не заменяют кэш; reconnect запрашивает полный snapshot.
3. Preview до join не имеет players/host/currentFrame; UI не трактует его как member.
4. Ошибка подготовки/сети не равна неверному ответу; сохраняется gameId для polling/retry, нет demo fallback.
5. Будущие кадры, правильный movieId, aliases и TMDB token не передаются/не сохраняются в браузере или frontend image.

## Задачи и интерфейсы

### 1. HTTP, guest и DTO

- [x] RED: tests transport credentials, bootstrap dedup, network retry/reused key, malformed/secret-bearing DTO rejection.
- [x] `shared/api/http.ts`: `request(path, body?)`, `ensureGuest()`, safe ApiError; UUID keys живут до определённого исхода.
- [x] `shared/api/contracts.ts`: parsers unknown → UI DTO, strict projection, версия и personal attempts.
- [x] `shared/types/game.ts`, `multiplayer.ts`: pending/loading/error, preview/member, serverTime/version.
- [x] GREEN: адресный Vitest; отдельные API fixtures существуют только в тестах, глобальный TMDB mock удаляется.

### 2. Соло и поиск

- [x] RED: POST 202 → polling, resume attempts, stale version, guess ID/frame, errors без штрафа.
- [x] `games.api.ts`: create/get/retry/guess/skip, только HTTP. `collections.api.ts`, feature movies search — серверные GET.
- [x] `game.store.ts`: загрузка/resume/version guard, отмена устаревшего UI-запроса, результат без потери экрана.
- [x] `useGameConsole.ts`: отправлять selectedMovie.id; попытки восстанавливать из snapshot.
- [x] GREEN: API/store/component tests; UI loading/error/result и refresh.

### 3. Комнаты и WS

- [x] RED: ticket scope/auth/subscribe, reconnect fresh ticket, unsubscribe cleanup, version ordering, preview.
- [x] `shared/api/realtime.ts`: соединение с generation guard, auth timeout и reconnect backoff; без client heartbeat/game rules.
- [x] `shared/api/multiplayer/index.ts`: async HTTP commands, roundId + expectedFrameIndex, snapshot parser.
- [x] `multiplayer.store.ts`: async bootstrap, preview/member state, latest snapshots, connection status и UI clock offset.
- [x] Room/Lobby UI: сетевые сообщения вместо demo, disable start до room subscription, reconnect/error feedback.
- [x] GREEN: Vitest и настоящий матч независимых contexts с паролем, личными кадрами, итогом и reconnect.

### 4. Удаление заменённой реализации и Docker

- [x] Удалить root `api/`, `server/`, game-session, demo-adapter/room-model/storage-schema, browser TMDB/OCR и их tests.
- [x] Удалить ranking/title matching/percentile slicing; сохранить UI labels/validators и next-difficulty UX.
- [x] Избирательно очистить legacy demo/session storage; тему и UI prefs сохранить.
- [x] Yarn remove tesseract.js; lock обновляет только Yarn. Удалить frontend TMDB env лишь после проверки backend.
- [x] Dockerfile Node 24 → nginx:80, `.dockerignore`, nginx `/api/v1` и `/ws` → `api:3000`, SPA fallback без API fallback.
- [x] Vite dev/preview proxy → `127.0.0.1:3000`; Vercel не получает выдуманный production backend URL.
- [x] Перечислить и удалить только пустые папки внутри resolved frontend root, исключить dependencies/git/caches.

### 5. Документация, Git и приёмка

- [x] README/AGENTS/docs git-workflow: main/dev постоянные, feature/fix → PR dev → checks → annotated dev/unique → publish → delete branch.
- [x] Release обычным merge dev → main → checks → annotated vSemVer → publish → удалить только dev/* reachable из version commit.
- [x] CI различает `dev/*` и `v*` tags, ничего не публикует и не удаляет автоматически.
- [x] `yarn validate`, `yarn build`, Docker8080 real browser E2E, отсутствие secrets/answer/future frames в active Network/storage/dist.
- [x] Сохранить отчёт/скриншоты; не объявлять неподтверждённые сценарии пройденными.

## Журнал исполнения

- Начало: контракт 0.1.0 прочитан, HTTP/WS решения подтверждены запросом владельца. Кэш snapshots хранится в Pinia,
  адаптер использует async getters вместо прежних sync getters — не дублировать кэш между двумя слоями.
- Проверки и завершённые пункты обновляются после выполнения, не по предположению.

## Оставшиеся внешние проверки

- [ ] Физические устройства/LAN, 3–4 участника, live 90-секундный timeout/host transfer/restart/outage.
- [ ] Staging и отдельно согласованный production hosting/TLS/domain/cutover.
- [ ] Запуск нового CI и реального merge/release/tag cleanup на GitHub — не входит в текущую задачу.

## Итог исполнения

Все локальные implementation-пункты выше выполнены. `yarn validate`: 74/74, `yarn build`: PASS.
Docker image `d4375ae40397…` проверен на localhost:8080. Настоящий браузерный матч двух независимых contexts:
1200/1000; fresh-ticket reconnect и безопасная смена identity без mutation replay прошли.
64 активных snapshots, storage, dist и container проверены на скрытый ответ/future frames/token.
Результаты, артефакты и границы: [verification.md](./verification.md).

Ruling: тестовый oracle — только read-only серверная БД, никогда не frontend storage/active Network;
это проверяет UI/API интеграцию с детерминированным правильным ID, а не умение теста распознавать фильм по картинке.
Четыре найденных review defects воспроизведены RED и исправлены до final Docker build; повторное независимое ревью подтвердило fixes.
После final image runtime не менялся; последующие правки — только docs, исключённые из image context.
