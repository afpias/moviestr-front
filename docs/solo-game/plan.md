# План реализации SPEC-001

Статус: реализовано. Спецификация: [`spec.md`](./spec.md).

## Исправление стабильности UI — 28 октября

Подход: безусловная трёхколоночная композиция страницы и постоянный GameStage shell. Loading/error/result находятся
внутри центральной сцены, а не заменяют маршрут. Store очищает старый кадр сразу при новом запросе, применяет выбранные
UI preferences сразу, но server snapshot остаётся единственным источником игрового состояния.

Файлы: GamePage.vue, GameStage.vue/CSS, game.store.ts, game-persistence.ts, browser-storage.ts, legacy-state.ts,
ранний безопасный appearance bootstrap в index.html/public; тесты страницы/store/storage и browser paint/DOM trace.
Отдельный безопасный preference-key сложности не меняет v2 opaque gameId/genre контракт и позволяет миграцию старого storage.
Theme/difficulty bootstrap синхронный до CSS/основного bundle; дублирования полного store или скрытых данных нет.

Проверки RED→GREEN: реальные POST202/loading GET через HTTP fixture, identity layout/sidebar/info при сменах и ошибках,
non-easy resume до завершения GET, blocked/corrupt storage, initial paint на Docker1440/360. Новая multiplayer-фаза
подключается только по готовому backend контракту, без самостоятельного перехода/подготовки фильма на клиенте.

## Подход

Страница координирует игровой сценарий через composable, а состояние раунда и переходы остаются в Setup Store. Запросы
к игровому адаптеру скрыты за `shared/api`; widgets получают состояние и события через типизированные props и emits.

## Архитектура

- `pages/game` — композиция сценария и координация загрузки, ответа и перехода.
- `widgets/game-stage`, `game-sidebar`, `game-info` — независимые области экрана.
- `features` — выбор сложности и жанра, поиск, показ результата.
- `shared/stores/game.store.ts` — состояние и действия активного раунда.
- `shared/api/games.api.ts` — контракт создания раунда, пропуска и ответа.

## Данные и переходы

Store хранит идентификатор игры, сложность, жанр, кадр и статус. Повторные действия блокируются в `submitting`.
Переходы сверяются с диаграммой из спецификации; новый фильм всегда заменяет прежний атомарно.

## Этапы

1. Реализовать контракт раунда и store.
2. Собрать действия в page composable.
3. Подключить widgets и результат.
4. Покрыть переходы и ошибки тестами.

## Риски и проверка

Основные риски — гонки запросов и рассинхронизация кадра. Их ограничивают disabled-состояния и тесты переходов
`playing/submitting/won/lost`; сценарии страницы проверяются Vue Test Utils.
