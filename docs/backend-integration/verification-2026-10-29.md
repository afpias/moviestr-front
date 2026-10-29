# Проверка исправлений соло и результата каждого фильма — 29 октября 2026

## Объём

SOL-015–017 / PER: постоянный DOM layout/sidebar/info при initial loading/202/polling/error/genre/difficulty/next/retry;
без прежнего кадра под видом нового. Ранняя тема и акцент, безопасный storage и legacy v2 resume.
MP-018/030–032: общий `round-result` после завершения всеми, правильный фильм/личный исход, серверный all-ready после каждого
фильма, включая последний. Нет автотаймера результата, клиентского счёта/перехода и браузерного ответа в storage.

## RED → GREEN

- Исходный Docker UI действительно удалял layout/sidebar/info; прежний DOM observer зафиксировал три удалённых узла.
- Styled paint trace исходного refresh: light → dark → easy → medium.
- `appearance.spec.ts`: corrupt preferences + valid v2 воспроизводил Easy вместо neutral loading; чтение ключей разделено.
- `appearance.spec.ts`: rejected POST смены сложности воспроизводил сохранённый Hard поверх старого Easy pointer;
  новые preferences записываются только после принятого POST. UI текущего запроса меняется сразу.
- Strict DTO tests сначала отклоняли все `round-result` snapshots; новые phase/nullable DTO теперь валидируются.
- Room result component tests сначала находили пустую сцену; теперь показываются фильм/личный исход/«Далее»/готовность.
- Старые тесты соло ждали наличие input и начинали ввод в loading; теперь ждут доступный control, не обходя busy guard.

## Обязательные проверки до freeze

- `yarn validate`: PASS, 96 тестов / 26 файлов. TypeScript, ESLint и Prettier прошли.
- `yarn build`: PASS. Runtime frozen после исправления rejected POST.
- Три прежних ESLint warnings именованных экспортов и предупреждение общей Prettier-конфигурации `importOrder: undefined`
  не маскируются и не исправляются расширением текущей задачи.
- Для нового классического `public/appearance.js` typed unused-vars с Espree давал доказанный false positive даже
  на `const theme; document...=theme`; только этому файлу задан эквивалентный стандартный `no-unused-vars`.

## Docker/browser

Проверен согласованный итоговый frontend image
`sha256:47f3987f3a4bae64ef7074fe5fea7182f63456fc8898317d65e6c3d9118a6970` на `http://localhost:8080`.
Backend migration 003 применена, три сервиса healthy. Runtime после freeze не менялся.
Оба настоящих Edge/Playwright сценария завершились с кодом 0:

- `frontend-results-e2e.mjs`: два независимых guests, оба фильма, personal win/loss, одно ready не двигает матч,
  refresh и fresh-ticket reconnect на reveal, последний all-ready → рейтинг; прежние HTTP/storage/secret проверки сохранены.
- `solo-stability-e2e.mjs`: реальные запросы с задержкой GET, DOM identity/геометрия, dark/light styled paints,
  legacy/corrupt/denied storage, rejected POST, transport error/retry, desktop/360 px.

Drivers находятся в локальной папке артефактов Codex; correctness oracle только read-only PostgreSQL из test runner,
не browser storage/Network и не runtime приложения.

### Наблюдения

- Соло: DOM observer не увидел удаления layout/sidebar/info во время реальных 202/delayed GET, жанра/сложности,
  транспортной ошибки и явного retry. Повторный E2E дополнительно подтвердил ту же identity через victory/Next/loss/Retry.
  Высота кадра до/во время loading одинакова.
- Hard/dark refresh: все styled paints сразу Hard/dark, без light/Easy. Light также появился до первого styled paint.
- Legacy v2 и corrupt prefs: `loading` с нейтральным `#8b949e` → `hard/#ff8139`, padding `.app-main` всё время `13.6px`,
  кадр после появления остаётся высотой `497.25px`. Нет смены layout mode на завершении GET.
- Отклонённый POST Expert сохраняет прежний Hard pointer/preferences; refresh показывает только Hard.
- SecurityError get/set/remove storage не мешает запуску и реальной игре на 360 px. Горизонтального page overflow нет.
- Мультиплеер: до общего завершения `result/roundResult=null`; после общего завершения оба видят один правильный фильм,
  у хоста victory, у гостя lost, currentFrame/deadline=null. Гость не получает solo «Повторить».
- Один ready сохраняет обоих на том же фильме. После ack кнопка disabled, счётчик `1 / 2`; reload хоста и fresh-ticket
  reconnect гостя сохраняют результат и готовность. После второго ready начинается только следующий серверный фильм.
- На последнем фильме тоже сначала reveal; один ready не открывает рейтинг. После обоих — серверный итог 1200/1000.
- Сохранились пароль/preview, RU/EN search, попытки/refresh, пять кадров/сдача, next/retry, native reconnect и безопасная
  смена guest без replay. 90 HTTP/WS snapshots повторного прогона проверены: преждевременного ответа/future frames нет,
  storage/dist/image без TMDB token.
- Browser JS errors и audit violations: 0. Ожидаемые HTTP ошибки только отрицательных сценариев:
  `403 WRONG_PASSWORD`, `401 SESSION_REQUIRED` при явном удалении cookie.

### Артефакты

- [Соло desktop Hard](./artifacts/2026-10-29-solo-desktop-hard.png)
- [Соло 360 px](./artifacts/2026-10-29-solo-mobile-360.png)
- [Победа в комнате](./artifacts/2026-10-29-room-won.png)
- [Поражение в комнате 360 px](./artifacts/2026-10-29-room-lost-360.png)
- [Итог двух фильмов](./artifacts/2026-10-29-room-finished.png)

Изображения визуально просмотрены: постер целиком, одинаковый стиль личных результатов, читаемая готовность,
нет наложения колонок и горизонтального скролла. На mobile используется естественный вертикальный скролл.

## Границы приёмки

Не выполнялись production cutover, физические устройства/LAN, 3–4 игрока, live 90-секундное ожидание/30-секундный grace,
перезапуск backend/БД и внешнее TMDB outage. Имитация отказов в solo ограничена тестовым browser context;
это не выдаётся за испытание реального отключения сервера. Во время этой браузерной приёмки Git refs/коммиты/push/merge
не менялись; последующий разрешённый владельцем этап фиксации описан ниже.

## Фиксация и подготовка первого релиза 0.1.0

- По сообщению координатора независимый reviewer по проектной роли проверил полный накопленный diff без подтверждённых P0–P3.
- Версия frontend обновлена с 0.0.0 до 0.1.0 штатным Yarn version без автоматического коммита/тега.
  `yarn check --integrity` подтвердил согласованность установленного дерева и lockfile.
- В локальный коммит входят накопленные исходники, тесты, Docker и документация; credentials, dist и служебные caches исключены.
- Публикация ветки, PR, merge dev/main и теги относятся к отдельным действиям координатора, не к этому локальному коммиту.
- После Docker-приёмки функциональный код не менялся: только версия package и оформление отчёта.
