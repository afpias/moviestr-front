# План реализации SPEC-008

Связанная спецификация: [`spec.md`](./spec.md).

## Подход и архитектура

Инфраструктура вне FSD: `.github/workflows`, `scripts/pr-review`. Игровые slices не меняются.
`ci.yml` работает на `pull_request` в `dev` и `main`, запускает Validate и Build на merge commit без секретов.
`pr-review.yml` работает на `pull_request_target`; checkout выполняется только для точного base SHA.
Head скачивается через git fetch, но никогда не checkout и не выполняется.

В job анализа нет write-токена GitHub и установки пакетов проекта. Скрипт читает git objects, передаёт diff,
изменённые файлы и SDD в OpenAI Responses API со строгой JSON-схемой. Модель не имеет shell/tools.
Отдельный job получает короткоживущий installation token GitHub App, валидирует артефакт и публикует результат.
Сбой анализа переводит `AI review` в failure; пустой или усечённый контекст не является успешным ревью.
Для обновления base используется событие edited; strict CI требует актуальной базы перед слиянием.

## Данные и API

- GitHub REST: PR metadata, collaborator permission, reviews, commit statuses.
- OpenAI Responses API: `text.format = json_schema`, `store = false`, tools отсутствуют.
- Ответ: `complete`, `summary`, `findings[]` с priority, path, line, title, body.
- Артефакт: номер PR, base SHA, head SHA и ответ; срок хранения один день. Разрешённые строки diff повторно
  вычисляет job публикации из git objects, не доверяя координатам модели.
- Имена файлов и SHA передаются аргументами git без shell-интерполяции; секреты не печатаются.

## Установка владельцем

1. Создать GitHub App в организации `afpias`: Settings → Developer settings → GitHub Apps → New GitHub App.
   Название, например `Moviestr Reviewer` (при занятости выбрать уникальное); Homepage — адрес репозитория.
   Webhook отключить: события обрабатываются GitHub Actions. Callback URL и OAuth для пользователей не нужны.
2. Repository permissions: **Contents: Read**, **Pull requests: Read and write**, **Commit statuses: Read and write**.
   Metadata read добавляется GitHub. Не выдавать Administration или Contents write.
3. Install App → Only select repositories → `moviestr-front`. Сохранить App ID (не Client ID).
4. Generate a private key. PEM-файл не помещать в репозиторий.
5. Repository Settings → Secrets and variables → Actions → Secrets добавить:

| Secret                   | Значение                                          |
| ------------------------ | ------------------------------------------------- |
| `OPENAI_API_KEY`         | ключ отдельного OpenAI API-проекта с лимитом трат |
| `REVIEW_APP_ID`          | числовой App ID                                   |
| `REVIEW_APP_PRIVATE_KEY` | всё содержимое PEM, включая BEGIN / END           |

6. Во вкладке Variables добавить `OPENAI_REVIEW_MODEL` — ID доступной в API модели с Responses и Structured Outputs.
   Модель намеренно не зашита в код. Подписка ChatGPT не заменяет настройку API-проекта и его оплаты.
7. Сначала слить установочный PR вручную после зелёных Validate и Build. Workflow `pull_request_target` начинает
   работать только после появления в целевой ветке. До этого AI review не делать обязательным.
8. Открыть небольшой тестовый PR, дождаться комментария App и `AI review`. Проверить P2, исправление новым коммитом,
   отсутствие секретов, ошибку API и гонку с новым SHA. Не отключать CI ради проверки.
9. После успешной проверки добавить `AI review` в required checks защиты `dev`, выбрав источник созданного App;
   Required approvals — 1, Dismiss stale approvals — on. Для `main` повторить после согласованного переноса workflow
   в `main`. Не включать требование последнего push approval: собственные публикации review бота его не заменяют.

## Защита веток

Начальный этап: для `main` и `dev` Require pull request, Validate и Build, strict up-to-date, без force push/delete,
enforce administrators. Нулевое число обязательных approvals только на время установки: один владелец не может
одобрить собственный PR. После установки — один approval и обязательный App-bound статус AI review.
Защита веток сама по себе не гарантирует запрет изменения workflow автором с write-доступом; это доверенные участники.

## Риски

AI может ошибаться и пропускать дефекты: он дополняет CI и ручную проверку. Данные PR недоверенные; модель не исполняет
инструкции из них и не получает секреты. Большие diff требуют разделения PR, а не молчаливого усечения.
Контекст ограничен изменёнными файлами и спецификациями: при нехватке контекста модель обязана вернуть complete=false.
GitHub App без Contents write не может слить PR. Администратор организации всё равно может изменить защиту веток.

## Проверка

`yarn test:unit scripts/pr-review/__tests__`, `yarn validate`, `yarn build`, разбор YAML и проверка GitHub API.
REV-005–008: тесты валидатора, SHA, приоритетов, diff positions, неполного ответа и ограничения контекста.
REV-001–003,009–010: проверка workflow и затем реальный PR после ручного подключения App/секретов.

## Текущее состояние подключения

2026-10-18 через GitHub API включена начальная защита обеих веток. Required checks `Validate` и `Build` привязаны
к GitHub Actions App; strict up-to-date, enforce administrators и разрешение только PR включены.
Force push и удаление запрещены. AI review и один обязательный approval пока не включены: нужны установка workflow,
GitHub App, секреты и реальный пробный запуск. Ни один PR автоматически не сливается.
