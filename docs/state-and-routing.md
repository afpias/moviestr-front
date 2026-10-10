# Состояние и маршрутизация

## Правило размещения состояния

Использовать наименьшую подходящую область жизни:

1. `ref` в компоненте — состояние нужно только одному компоненту.
2. Feature composable — состояние и сценарий разделяются внутри одной feature.
3. Pinia store — состояние нужно нескольким несвязанным компонентам, нескольким страницам или оно должно пережить навигацию.
4. localStorage — только явно утверждённое долговременное состояние.

В MVP в localStorage сохраняются только:

- текущая незавершённая игра;
- выбранная светлая или тёмная тема.

Результаты прошлых игр, победы, серии и глобальная статистика пока не сохраняются.

## Pinia

Используются только Setup Stores:

Все Pinia stores располагаются в `shared/stores`. Для MVP там находятся как минимум `game.store.ts` и `theme.store.ts`. Компоненты и features обращаются к store через алиас `@shared`, а не через глубокие относительные пути.

```ts
export const useGameStore = defineStore('game', () => {
	const status = ref<GameStatus>('idle')

	function startGame(): void {
		status.value = 'loading'
	}

	return {
		status,
		startGame
	}
})
```

Store обязан экспортировать только состояние и действия, нужные потребителям. Внутренние детали не возвращаются для удобства теста.

### Game store

Минимальная модель состояния:

```ts
interface ActiveGameState {
	currentFrameIndex: number
	gameId: string
	lastError: string | null
	points: number | null
	status: GameStatus
	totalFrames: 6
}

type GameStatus = 'idle' | 'loading' | 'playing' | 'submitting' | 'won' | 'lost' | 'error'
```

Разрешённые основные переходы:

```text
idle -> loading -> playing
playing -> submitting -> playing
playing -> submitting -> won
playing -> submitting -> lost
loading|submitting -> error -> предыдущее восстанавливаемое состояние
```

Двойная отправка ответа во время `submitting` блокируется.

### Theme store

Theme store хранит только `'light' | 'dark'`, применяет класс темы к корневому элементу и синхронизируется с localStorage. Системная тема может использоваться как начальное значение, если сохранённого выбора нет.

## Persistence

Доступ к localStorage выполняется через адаптер, а не напрямую из компонентов или stores.

Ключи имеют namespace и версию:

```text
moviestr:game:v1
moviestr:theme:v1
```

При чтении данные проверяются. Повреждённая или неизвестная версия удаляется только для соответствующего ключа и заменяется безопасным начальным значением.

В localStorage не сохраняются:

- правильный ответ до окончания игры;
- секреты и API-ключи;
- полные изображения;
- экземпляры ошибок и реактивные объекты Vue.

## Router

Router располагается в `app/router.ts`. Папка `app/router/` создаётся только после декомпозиции конфигурации на несколько файлов.

Все маршруты именованные. Компоненты страниц загружаются лениво:

```ts
{
	path: '/rules',
	name: ROUTE_NAMES.rules,
	component: () => import('@pages/rules/RulesPage.vue')
}
```

Имена и пути маршрутов объявляются рядом с router-конфигурацией. Строки маршрутов не дублируются по компонентам.

```ts
export const ROUTE_NAMES = {
	game: 'game-round',
	home: 'home',
	notFound: 'not-found',
	rules: 'rules',
	statistics: 'statistics'
} as const
```

### Route meta

Meta типизируется через расширение `RouteMeta`. Минимальные поля:

- `title` — заголовок страницы;
- `layout` — только после появления нескольких layouts;
- `requiresAuth` — резерв для будущей авторизации, не используется в MVP.

Navigation guards отвечают только за навигационные правила. Они не загружают весь раунд и не заменяют feature-actions.

## Восстановление игры

При открытии `/game/:id`:

1. Проверяется сохранённая игра с тем же `gameId`.
2. Выполняется запрос состояния через API-клиент.
3. Ответ API является источником истины для статуса и номера кадра.
4. При отсутствии раунда показывается контролируемое состояние «Игра не найдена» с переходом на главную.

Пока используется frontend mock, пункт 3 имитируется MSW. Контракт сохраняется для будущего backend.
