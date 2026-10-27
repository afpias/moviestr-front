# Задачи SPEC-009

Статус: только план. [`spec.md`](./spec.md), [`plan.md`](./plan.md).
Согласованы полный scope и NestJS/TypeScript/PostgreSQL; технические предложения требуют review перед реализацией.

## Подготовка и контракт

- [ ] Подтвердить native WS, guest session/ticket, HTTP topology, title → movieId и правила preloading кадров.
- [ ] Выбрать место отдельного backend-проекта, ORM, версии, hosting и retention; не создавать внешние ресурсы без разрешения.
- [ ] Зафиксировать OpenAPI, event schema, DTO preview/snapshot/version/serverTime и error codes (BE-001,004,005).
- [ ] Обновить затронутые требования SPEC-001/002/003/006/007, не переписывая историю существующего демо.

## Backend

- [ ] Nest infrastructure, PostgreSQL migrations, guest ownership, validation/errors, healthchecks (BE-001,002).
- [ ] TMDB client, RU/EN search, percentile catalog, пять кадров и server OCR cache (BE-004,012,013).
- [ ] Solo API, persistence, guess/skip и idempotency (BE-003,005,010,011).
- [ ] Lobby API: list/preview/create/join/start/leave и пароль (BE-006,009).
- [ ] Match domain, score, personal progress, unique movies, transactional transitions (BE-007,008,011).
- [ ] Персональный WS, reconnect, presence, scheduler, host transfer, preparation lease (BE-009–011,013).
- [ ] Contract tests и реальные PostgreSQL tests для гонок/restart; security projection tests для скрытого ответа.
- [ ] Передать frontend-агенту OpenAPI, WS fixtures, env и инструкции запуска.

## Frontend — только после готовности API

- [ ] HTTP client и network multiplayer adapter с snapshot cache; async guest initialization.
- [ ] Подключить solo/search/lobbies, убрать клиентскую preparation и проверку ответа.
- [ ] Сохранить локальные UI-настройки; мигрировать/очистить только старые demo session keys.
- [ ] Проверить все маршруты, resume, поиск, результаты, reconnect и личные попытки.
- [ ] Удалить заменённый demo/runtime backend и Vercel TMDB proxy, обновить config/dependencies (BE-014).

## Verify

- [ ] Backend unit/integration/security/concurrency tests и OpenAPI validation.
- [ ] Полный матч 2–4 независимых браузеров и двух устройств; server restart и TMDB outage.
- [ ] Frontend yarn validate/build, desktop/360 px E2E, отсутствие answer/token в Network/storage/dist.
- [ ] Staging, затем отдельно согласованный production cutover; обновить документацию по факту.
