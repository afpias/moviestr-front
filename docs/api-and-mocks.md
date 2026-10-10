# API и mock-инфраструктура

## Принцип

UI всегда работает через HTTP-контракт. Mock Service Worker перехватывает те же запросы, которые позже будут отправляться настоящему backend. Компонент и feature-store не должны знать, mock это или production API.

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
- конкретные функции `startGame`, `submitGuess`, `searchMovies` находятся в API-сегменте соответствующей feature.

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
- `INTERNAL_ERROR` — непредвиденная ошибка.

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
	"id": "top-250",
	"title": "Топ 250",
	"description": "Подборка известных фильмов",
	"movieCount": 250
}
```

До наполнения каталога `movieCount` должен отражать фактическое количество mock-фильмов, даже если маркетинговое название подборки остаётся «Топ 250».

### Начать игру

```http
POST /api/v1/games
Content-Type: application/json
```

```ts
interface StartGameRequest {
	collectionId: string
}

interface GameFrame {
	alt: string
	index: number
	url: string
}

interface StartGameResponse {
	currentFrame: GameFrame
	gameId: string
	status: 'playing'
	totalFrames: 6
}
```

Ответ не содержит `movieId`, правильное название, aliases или URL будущих кадров.

### Получить состояние игры

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
	id: string
	releaseYear: number
	title: string
}

interface MovieSuggestionsResponse {
	items: MovieSuggestion[]
}
```

Минимальная длина запроса — 2 символа. Максимум — 10 результатов. Автодополнение не сообщает, какой фильм выбран для текущего раунда.

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
			points: number
			result: GameResult
			status: 'won'
	  }
	| {
			correct: false
			points: 0
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

## Ограничение безопасности

При frontend-only mock правильные ответы физически присутствуют в клиентской сборке и могут быть найдены пользователем. Это допустимо только для разработки MVP. Перед публичной соревновательной версией выбор фильма, проверка ответа и начисление очков должны быть перенесены на backend.

## Изображения и каталог

Каждый фильм имеет ровно шесть кадров в порядке от сложного к узнаваемому. Имена файлов и URL не должны содержать название фильма. Перед публикацией необходимо отдельно зафиксировать источник рейтинга, изображений и права на их использование.

## Официальные ссылки

- [MSW browser integration](https://mswjs.io/guides/integrations/browser)
- [MSW setupWorker](https://mswjs.io/api/setup-worker/)
- [MSW quick start and Node integration](https://mswjs.io/docs/quick-start)
