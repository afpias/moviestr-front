# API и mock-инфраструктура

## Принцип

UI всегда работает через HTTP-контракт. Mock Service Worker перехватывает те же запросы, которые позже будут отправляться
настоящему backend. В development MSW получает каталог и изображения через TMDB, а в тестах использует фиксированные
fixtures. Компонент и feature-store не должны знать источник данных.

MSW включается только в development и тестовом окружении. Production-сборка не должна запускать Service Worker с mock handlers.

## Размещение

```text
src/shared/api/
├── client.ts
├── api-error.ts
└── mock/
    ├── browser.ts
    ├── handlers.ts
    ├── server.ts
    └── data/
```

- `client.ts` — базовый URL, JSON, timeout/abort и преобразование ошибок.
- `mock/handlers.ts` — handlers, общие для браузера и Vitest.
- `mock/browser.ts` — `setupWorker`.
- `mock/server.ts` — `setupServer` для тестов.
- `mock/data` — фильмы, коллекции и внутреннее состояние mock-сессий.
- `mock/tmdb` — runtime-валидация и адаптация ответов TMDB к внутренней модели.
- конкретные функции загрузки фильма, пропуска кадра, проверки ответа и поиска находятся в API-сегменте соответствующей
  feature.

## Общий формат ошибки

```ts
interface ApiErrorBody {
	code: string
	message: string
	requestId?: string
}
```

Ожидаемые коды MVP:

- `VALIDATION_ERROR` — некорректный запрос;
- `COLLECTION_NOT_FOUND` — подборка не существует;
- `GAME_NOT_FOUND` — раунд не найден;
- `GAME_FINISHED` — попытка ответить после окончания;
- `RATE_LIMITED` — резерв для backend;
- `INTERNAL_ERROR` — непредвиденная ошибка;
- `SERVICE_NOT_CONFIGURED` — не задан локальный TMDB token;
- `UPSTREAM_ERROR` — TMDB недоступен или вернул некорректный ответ.

UI отображает безопасный локализованный текст по `code`. Поле `message` используется для диагностики и не считается готовым пользовательским текстом.

## Контракты

Base URL: `/api/v1`.

### Получить подборки

```http
GET /api/v1/collections
```

```ts
interface MovieCollectionSummary {
	description: string
	id: string
	movieCount: number
	title: string
}

interface GetCollectionsResponse {
	items: MovieCollectionSummary[]
}
```

Первая mock-подборка:

```json
{
	"id": "tmdb-catalog",
	"title": "Каталог TMDB",
	"description": "Фильмы TMDB, ранжированные по известности",
	"movieCount": 10000
}
```

В development `movieCount` отражает фактическое количество результатов, доступных через пагинацию TMDB Discover, и
может изменяться. В тестах значение отражает количество fixture-фильмов.

### Загрузить фильм для режима

```http
POST /api/v1/games
Content-Type: application/json
```

```ts
interface LoadChallengeRequest {
	collectionId: string
	difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'impossible'
	genre: 'all' | 'action' | 'comedy' | 'drama' | 'thriller' | 'horror' | 'science-fiction' | 'animation'
}

type Difficulty = LoadChallengeRequest['difficulty']

interface GameFrame {
	alt: string
	index: number
	url: string
}

interface LoadChallengeResponse {
	currentFrame: GameFrame
	difficulty: Difficulty
	gameId: string
	genre: LoadChallengeRequest['genre']
	status: 'playing'
	totalFrames: 5
}
```

Запрос выполняется автоматически при первом открытии `/`, смене режима, жанра и замене фильма после последнего кадра. Внутренний
`gameId` нужен только mock/backend для проверки ответа: он не отображается, не попадает в URL и не создаёт отдельную
пользовательскую «игру». Ответ не содержит `movieId`, правильное название, aliases или URL будущих кадров.

### Получить сохранённое состояние

```http
GET /api/v1/games/:gameId
```

Для активной игры возвращаются текущий кадр, его индекс и статус. Для завершённой дополнительно возвращается результат.

### Найти фильм для автодополнения

```http
GET /api/v1/movies/suggestions?q={query}
```

```ts
interface MovieSuggestion {
	englishTitle: string
	id: string
	releaseYear: number
	title: string
}

interface MovieSuggestionsResponse {
	items: MovieSuggestion[]
}
```

Минимальная длина запроса — 2 символа. Максимум — 10 результатов. Поиск TMDB должен находить русские, английские,
оригинальные и альтернативные названия. Подсказка показывает русское и английское названия, если они отличаются.
Автодополнение не сообщает, какой фильм выбран для текущего раунда.

### Отправить ответ

```http
POST /api/v1/games/:gameId/guesses
Content-Type: application/json
```

```ts
interface SubmitGuessRequest {
	title: string
}

type SubmitGuessResponse =
	| {
			correct: false
			currentFrame: GameFrame
			status: 'playing'
	  }
	| {
			correct: true
			result: GameResult
			status: 'won'
	  }
	| {
			correct: false
			result: GameResult
			status: 'lost'
	  }

interface GameResult {
	originalTitle: string
	posterUrl: string
	releaseYear: number
	title: string
}
```

UI вызывает проверку только для объекта фильма, выбранного из автодополнения. Произвольная строка и пустое поле не
отправляются как ответ.

### Пропустить кадр

```http
POST /api/v1/games/:gameId/skip
```

Пропуск не требует body. До пятого кадра возвращается следующий `GameFrame`. На пятом кадре возвращается завершённое
состояние поражения с правильным ответом; UI заменяет центральную игровую область результатом и ждёт действия «Повторить».

## Нормализация ответа

Нормализация является частью серверного контракта. В mock она выполняется внутри handler, в будущем — на backend. Frontend может нормализовать строку для UX, но не определяет правильность самостоятельно.

## Поведение MSW

- Browser worker запускается и полностью ожидается до mount Vue-приложения.
- Vitest использует `setupServer` и те же handlers.
- Необработанный запрос в тесте является ошибкой.
- В development необработанный запрос логируется или пропускается согласно явной настройке.
- Стандартная искусственная задержка — 200–500 мс.
- Ошибочные сценарии переключаются тестовым handler или dev-параметром, а не случайностью.
- Mock state сбрасывается между тестами.

## TMDB

- API Read Access Token читается из `VITE_TMDB_READ_TOKEN` и задаётся только в `.env.local`.
- Фиксированного пула фильмов нет. Первая страница TMDB Discover сообщает размер доступного каталога, после чего
  приложение выбирает случайную страницу внутри процентиля текущей сложности. Страницы и метаданные кэшируются
  отдельно для каждого жанра.
- TMDB Discover сортируется по `vote_count.desc`, чтобы процентильные страницы соответствовали устойчивой известности.
  Кандидаты выбранной страницы дополнительно ранжируются по составной оценке: 70% нормализованного логарифма
  `vote_count` и 30% нормализованного логарифма `popularity`.
- Переданная сложность выбирает фильм из непересекающегося процентиля: 10%, 20%, 25%, 25% и 20% для `easy`, `medium`,
  `hard`, `expert` и `impossible` соответственно.
- Поиск выполняется через TMDB movie search с локалью `ru-RU`; результаты дополнительно запрашиваются с `en-US` и
  объединяются по `id`, чтобы корректно показывать русские и английские запросы.
- Для игры выбирается фильм как минимум с пятью backdrop-изображениями.
- Кандидаты в backdrops проходят проверку размера, ориентации и языковой маркировки TMDB. Изображения с указанным
  языком исключаются как вероятные title cards. OCR работает лениво в браузерном worker, распознаёт русский и английский
  текст и исключает изображения, содержащие допустимое название фильма.
- OCR имеет общий бюджет 1,2 секунды на создание раунда и не может заблокировать загрузку игры. После исчерпания бюджета
  используются только backdrops без языковой маркировки; полная обязательная OCR-проверка переносится в будущий backend
  или конвейер предварительной обработки.
- Из безопасных кандидатов выбираются пять изображений и сортируются по возрастанию эвристической узнаваемости на
  основе `vote_count` и `vote_average` изображения. Порядок сохраняется в рамках сессии.
- URL изображений строятся через официальный TMDB image base URL и не содержат название фильма.
- UI показывает требуемое уведомление об атрибуции TMDB.
- При отсутствии токена API возвращает `SERVICE_NOT_CONFIGURED`; SVG-заглушки не используются.

## Ограничение безопасности

При frontend-only реализации правильные ответы и TMDB token доступны в браузере и могут быть найдены пользователем.
Это допустимо только для локального прототипа. Перед публичной соревновательной версией интеграция с TMDB, выбор
фильма и проверка ответа должны быть перенесены на backend.

## Изображения и каталог

Каждый раунд использует ровно пять TMDB backdrops. Автоматический порядок является эвристикой и не умеет достоверно
определять присутствие главного актёра; до production он требует редакторской проверки или отдельной vision-модели.
OCR исключает кадр только при совпадении распознанного текста с названием фильма и не заменяет модерацию контента.
Имена файлов и URL не содержат название фильма. Использование данных и изображений сопровождается атрибуцией TMDB и
должно соответствовать их актуальным условиям.

## Официальные ссылки

- [MSW browser integration](https://mswjs.io/guides/integrations/browser)
- [MSW setupWorker](https://mswjs.io/api/setup-worker/)
- [MSW quick start and Node integration](https://mswjs.io/docs/quick-start)
- [TMDB movie search](https://developer.themoviedb.org/reference/search-movie)
- [TMDB movie images](https://developer.themoviedb.org/reference/movie-images)
- [TMDB attribution requirements](https://developer.themoviedb.org/docs/faq)
- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
