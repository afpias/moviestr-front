# Задачи SPEC-008

Документы: [`spec.md`](./spec.md), [`plan.md`](./plan.md).

## Spec и Plan

- [x] Зафиксировать согласованные границы и безопасное поэтапное подключение.

## Implement

- [x] REV-001: добавить CI Validate и Build без секретов.
- [x] REV-003–008: реализовать анализ и изолированную публикацию ревью.
- [x] REV-002: настроить начальную защиту main и dev, проверить через API.
- [x] REV-010: подготовить инструкцию GitHub App, Secrets и модели.

## Verify

- [x] Проверить валидатор, статусы, SHA, приоритеты и недопустимые строки: 30 новых тестов.
- [x] Выполнить yarn validate (142 теста), yarn build и разбор YAML. Четыре существующих warning ESLint.
- [x] Открыть [PR №2](https://github.com/afpias/moviestr-front/pull/2) в dev: Validate и Build прошли на GitHub.
- [ ] Владелец: создать App, добавить Secrets и модель; вручную слить установочный PR.
- [ ] После подключения: проверить реальное Approve / Request changes и отказоустойчивость.
- [ ] После проверки: включить App-bound AI review и один approval в защите целевых веток.
