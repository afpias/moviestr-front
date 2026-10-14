# Технический контракт: API и TMDB-интеграция

Пользовательские требования к каталогу и поиску заданы в
[SPEC-002](./specs/SPEC-002-movie-catalog.md) и [SPEC-003](./specs/SPEC-003-movie-search.md).

## Принцип

Frontend-прототип обращается к TMDB напрямую через типизированный адаптер. Локальный session-адаптер создаёт раунд,
переключает кадры и проверяет ответ, сохраняя публичные контракты игрового store. Компоненты не вызывают `fetch`
напрямую. Runtime mock API, Service Worker и искусственные задержки не используются.

## Размещение

```text
src/shared/api/
├── api-error.ts
├── game-session.ts
├── games.api.ts
└── tmdb/
    ├── catalog.ts
    ├── client.ts
    ├── frame-selection.ts
    └── ocr.ts
```

- `tmdb/client.ts` отвечает за авторизацию, timeout, дедупликацию запросов и runtime-валидацию внешних ответов.
- `tmdb/catalog.ts` выбирает фильм по сложности и преобразует данные TMDB в игровую модель.
- `game-session.ts` хранит локальное состояние активных раундов без HTTP и Service Worker.
- feature-specific поиск фильма остаётся в `features/search-movie/api`.

## Ошибки

Адаптер выбрасывает `ApiError` с безопасным кодом:

- `GAME_NOT_FOUND` — сохранённый локальный раунд отсутствует;
- `GAME_FINISHED` — действие отправлено после завершения раунда;
- `SERVICE_NOT_CONFIGURED` — отсутствует `VITE_TMDB_READ_TOKEN`;
- `TIMEOUT` — TMDB не ответил вовремя;
- `UPSTREAM_ERROR` — сеть, некорректный ответ или ошибка TMDB.

## Игровые контракты frontend-прототипа

`loadChallenge(collectionId, difficulty, genre)` создаёт локальную сессию и возвращает только первый кадр:

```ts
interface GameFrame {
	alt: string
	index: number
	url: string
}

interface PlayingGameResponse {
	currentFrame: GameFrame
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	status: 'playing'
	totalFrames: 5
}
```

Ответ не раскрывает `movieId`, правильное название, aliases или URL будущих кадров. `getChallenge(gameId)` восстанавливает
локальную сессию, `skipFrame(gameId)` открывает следующий кадр, а `submitGuess(gameId, title)` проверяет нормализованное
русское, английское, оригинальное или альтернативное название. После пятого неверного ответа или пропуска возвращается
результат поражения; после правильного ответа — результат победы.

`gameId` нужен только локальному session-адаптеру и будущему backend. Он не отображается и не создаёт отдельную
пользовательскую игру.

## Поиск

`searchMovies(query)` выполняет два параллельных TMDB movie search запроса с локалями `ru-RU` и `en-US`, объединяет
результаты по TMDB ID и возвращает до десяти вариантов:

```ts
interface MovieSuggestion {
	englishTitle: string
	id: string
	releaseYear: number
	title: string
}
```

Минимальная длина запроса — два символа. Произвольный текст не считается ответом, пока пользователь не выбрал фильм.

## Выбор фильма и производительность

- первая Discover-страница определяет размер каталога и кэшируется по жанру;
- случайная позиция выбирается внутри процентиля сложности, после чего загружается только нужная страница;
- кандидаты без `backdrop_path` исключаются до загрузки подробностей;
- детали, альтернативные названия и изображения кандидата объединяются одним запросом через `append_to_response`;
- одновременные одинаковые TMDB-запросы используют один Promise, успешные ответы кэшируются в памяти;
- ошибка OCR переводит отбор на fallback по метаданным TMDB, а не запускает перебор следующих фильмов;
- игровые изображения запрашиваются в размере `w780`, будущие кадры раунда предзагружаются в фоне.

## Безопасные кадры

Фильм должен иметь не менее пяти горизонтальных backdrops без языковой маркировки. Кадры сортируются по эвристике
узнаваемости. OCR имеет короткий общий бюджет и исключает изображение, если распознанный текст содержит допустимое
название фильма. После ошибки или исчерпания бюджета используются кандидаты без языковой маркировки TMDB. Полная
гарантия требует backend-конвейера или редакторской модерации.

## Ограничение безопасности

TMDB token, правильные ответы и локальные сессии доступны в браузере. Это допустимо только для frontend-прототипа.
Перед публичным запуском TMDB-интеграция, выбор фильма и проверка ответа переносятся на backend.

## Внешние ссылки

- [TMDB movie details](https://developer.themoviedb.org/reference/movie-details)
- [TMDB movie search](https://developer.themoviedb.org/reference/search-movie)
- [TMDB movie images](https://developer.themoviedb.org/reference/movie-images)
- [TMDB attribution requirements](https://developer.themoviedb.org/docs/faq)
- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
