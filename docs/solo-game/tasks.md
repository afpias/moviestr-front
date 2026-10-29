# Задачи SPEC-001

Статус: выполнено. Документы: [`spec.md`](./spec.md), [`plan.md`](./plan.md).

## Исправление SOL-015–017 — в работе

- [x] Воспроизвести DOM removal и paint transitions на исходном Docker UI.
- [x] RED→GREEN: реальный 202/polling/error/retry с проверкой identity постоянных областей.
- [x] Стабильный page/stage shell без старого кадра; безопасные preference/resume и ранняя appearance initialization.
- [x] RED→GREEN: non-easy resume, corrupt/blocked storage, late-request/identity regressions.
- [x] RED→GREEN: corrupt prefs + valid legacy pointer и отклонённый POST не создают ложный акцент при reload.
- [x] Validate/build и browser DOM/paint/360 px на согласованном финальном Docker image.

## Spec и Plan

- [x] Зафиксировать цикл из пяти кадров, исходы и переходы сложности.
- [x] Определить границы store, API, страницы, widgets и features.

## Implement

- [x] Реализовать автоматический старт и восстановление раунда.
- [x] Реализовать пропуск, ответ, победу, поражение, повтор и перезапуск.
- [x] Заблокировать повторные действия во время отправки.
- [x] Сохранить каркас интерфейса при загрузке и ошибке.

## Verify

- [x] Покрыть переходы store и API unit-тестами.
- [x] Покрыть основной пользовательский сценарий component-тестом страницы.
- [x] Связать требования с кодом и тестами в трассировке спецификации.
