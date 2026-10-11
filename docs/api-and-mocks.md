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
	"id": "top-250",
	"title": "Топ 250",
	"description": "250 лучших фильмов по рейтингу TMDB",
	"movieCount": 250
}
```

В development `movieCount` равен 250. В тестах значение отражает количество fixture-фильмов.

### Начать игру

```http
POST /api/v1/games
Content-Type: application/json
```

```ts
interface StartGameRequest {
	collectionId: string
	difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'impossible'
}

type Difficulty = StartGameRequest['difficulty']

interface GameFrame {
	alt: string
	index: number
	url: string
}

interface StartGameResponse {
	currentFrame: GameFrame
	difficulty: Difficulty
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

Минимальная длина запроса — 2 символа. Максимум — 10 результатов. Поиск TMDB должен находить русские, английские,
оригинальные и альтернативные названия. Автодополнение не сообщает, какой фильм выбран для текущего раунда.

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
- Запрос каталога использует первые 250 позиций TMDB `top_rated` и выбирает фильм только из диапазона переданной
  сложности.
- Поиск выполняется через TMDB movie search с локалью `ru-RU`; результаты дополнительно запрашиваются с `en-US` и
  объединяются по `id`, чтобы корректно показывать русские и английские запросы.
- Для игры выбирается фильм как минимум с шестью backdrop-изображениями.
- Первые шесть подходящих backdrops перемешиваются один раз при создании раунда и сохраняют порядок в рамках сессии.
- URL изображений строятся через официальный TMDB image base URL и не содержат название фильма.
- UI показывает требуемое уведомление об атрибуции TMDB.
- При отсутствии токена API возвращает `SERVICE_NOT_CONFIGURED`; SVG-заглушки не используются.

## Ограничение безопасности

При frontend-only реализации правильные ответы и TMDB token доступны в браузере и могут быть найдены пользователем.
Это допустимо только для локального прототипа. Перед публичной соревновательной версией интеграция с TMDB, выбор
фильма и проверка ответа должны быть перенесены на backend.

## Изображения и каталог

Каждый раунд использует ровно шесть TMDB backdrops. Автоматический порядок не гарантирует возрастание узнаваемости и
до production требует редакторской подготовки. Имена файлов и URL не содержат название фильма. Использование данных и
изображений сопровождается атрибуцией TMDB и должно соответствовать их актуальным условиям.

## Официальные ссылки

- [MSW browser integration](https://mswjs.io/guides/integrations/browser)
- [MSW setupWorker](https://mswjs.io/api/setup-worker/)
- [MSW quick start and Node integration](https://mswjs.io/docs/quick-start)
- [TMDB movie search](https://developer.themoviedb.org/reference/search-movie)
- [TMDB movie images](https://developer.themoviedb.org/reference/movie-images)
- [TMDB attribution requirements](https://developer.themoviedb.org/docs/faq)
