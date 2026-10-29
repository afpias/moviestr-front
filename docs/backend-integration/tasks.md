# Задачи SPEC-009

Статус: frontend интегрирован с готовым backend, локальная Docker-приёмка пройдена 28 октября 2026.
[Спецификация](./spec.md), [план frontend](./frontend-plan.md), [отчёт](./verification.md).

## Контракт и подготовка

- [x] Прочитать готовые backend handoff, OpenAPI, DTO и native WS schema 0.1.0.
- [x] Подключить согласованные guest cookie/ticket, same-origin HTTP/WS, title → movieId и отсутствие preload закрытых кадров.
- [x] Актуализировать действующие frontend-спеки без механического переписывания исторических handoff-документов.

## Frontend

- [x] HTTP credentials/bootstrap, unknown DTO validation, pending games 202/polling.
- [x] Idempotency-Key на retry, expectedFrameIndex/roundId, stale-version и generation guards.
- [x] Соло, RU/EN search, restore attempted IDs, победа/поражение/next/retry.
- [x] Async lobbies/preview/member, пароли, native WS scoped tickets, auth/subscribe/reconnect/resync.
- [x] Удалить клиентскую preparation/score/deadline transitions и весь заменённый backend runtime.
- [x] Удалить root api/server, browser TMDB/OCR/ranking/title matching; Yarn remove tesseract.js.
- [x] Избирательно мигрировать legacy storage, сохранить темы и UI preferences.
- [x] Исправить и покрыть RED→GREEN четыре auth/network/lifecycle/resync race findings.
- [x] Node24 → nginx Dockerfile, API/WS reverse proxy, dockerignore; dev proxy и Vercel fallback без придуманного backend URL.
- [x] Удалить устаревший frontend .env после проверки backend token; .env.local не трогать.
- [x] Перечислить/проверить resolved paths и удалить 11 пустых каталогов; повторно проверить отсутствие пустых source/docs папок.
- [x] Закрепить единый Git workflow в README/AGENTS/docs и классификацию tag refs в CI, без реальных remote операций.

## Проверки

- [x] Frontend validate/build: 74 tests / 21 files, без ошибок.
- [x] Финальный Docker image и nginx/API-vs-SPA fallback, три healthy контейнера.
- [x] Реальный browser E2E localhost:8080, desktop/360 px, solo/search/refresh/result.
- [x] Два независимых contexts, password preview/join, личные кадры, +100/−50, полный матч 1200/1000.
- [x] Fresh-ticket reconnect и реальная потеря cookie → новая identity/preview без mutation replay.
- [x] 64 active snapshots, storage, dist и container без ответа/future frames/TMDB token.
- [x] Сохранить отчёт, test driver и визуально проверенные скриншоты.

## Внешние проверки, не выполненные этим frontend этапом

Дополнительная приёмка 29 октября: stable solo shell/early appearance и multiplayer round-result/all-ready реализованы,
96 frontend-тестов и build прошли; финальный Docker8080 проверен двумя независимыми guests и на 360 px.
Подробности и артефакты: [verification-2026-10-29.md](./verification-2026-10-29.md).

- [ ] Физические устройства/LAN и матч 3–4 участников.
- [ ] Live server restart, DB crash/recovery, 90-секундный timeout / 30-секундный host transfer и TMDB outage.
- [ ] Staging, production hosting/TLS/domain и отдельно согласованный cutover.
- [ ] Новый remote CI и настоящий merge/release/tag cleanup. Текущая задача фиксирует правила, не исполняет их.

## Исторический handoff backend

Первоначальный backend-план от 27 октября сохранён в [plan.md](./plan.md): его инвентаризация — состояние до миграции,
не инструкция восстановить удалённый runtime. Backend теперь находится в соседнем moviestr-back; его реализация,
миграции и backend tests отслеживаются там. Этот файл не дублирует их checklist и не выдаёт чужие результаты за frontend tests.
