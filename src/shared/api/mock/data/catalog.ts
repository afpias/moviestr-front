import { GAME_FRAME_COUNT } from '@shared/lib/game-rules'
import type { GameFrame, GameResult, MovieCollectionSummary, MovieSuggestion } from '@shared/types/game'

export interface CatalogMovie {
	aliases: string[]
	frames: GameFrame[]
	id: string
	originalTitle: string
	posterUrl: string
	releaseYear: number
	title: string
}

interface FramePalette {
	accent: string
	background: string
	foreground: string
}

const PALETTES = [
	{ accent: '#e88755', background: '#10172a', foreground: '#f5d7a1' },
	{ accent: '#59d38c', background: '#071711', foreground: '#c9ffe0' },
	{ accent: '#ef85bd', background: '#281338', foreground: '#f8d5e9' }
] satisfies readonly [FramePalette, FramePalette, FramePalette]

function createImage(scene: string, palette: FramePalette, frameIndex: number, isPoster = false): string {
	const width = isPoster ? 800 : 1200
	const height = isPoster ? 1120 : 675
	const safeScene = scene.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="g" cx="68%" cy="25%"><stop offset="0" stop-color="${palette.accent}" stop-opacity=".85"/><stop offset="1" stop-color="${palette.background}"/></radialGradient><filter id="n"><feTurbulence baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .13 0"/></filter></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width * 0.72}" cy="${height * 0.28}" r="${Math.min(width, height) * 0.18}" fill="${palette.foreground}" opacity=".16"/><path d="M0 ${height * 0.72} Q ${width * 0.28} ${height * 0.52} ${width * 0.55} ${height * 0.73} T ${width} ${height * 0.64} V ${height} H0Z" fill="#05060b" opacity=".88"/><rect width="100%" height="100%" filter="url(#n)" opacity=".35"/><text x="${width * 0.07}" y="${height * 0.12}" fill="${palette.foreground}" font-family="Arial,sans-serif" font-size="${width * 0.022}" font-weight="700" letter-spacing="6">${isPoster ? 'MOVIESTR' : `КАДР 0${frameIndex + 1}`}</text><text x="${width * 0.07}" y="${height * 0.84}" fill="#fff" font-family="Arial,sans-serif" font-size="${width * (isPoster ? 0.06 : 0.047)}" font-weight="800">${safeScene}</text></svg>`

	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function createMovie(
	id: string,
	title: string,
	originalTitle: string,
	releaseYear: number,
	aliases: string[],
	scenes: string[],
	palette: FramePalette
): CatalogMovie {
	return {
		aliases,
		frames: scenes.slice(0, GAME_FRAME_COUNT).map((scene, index) => ({
			alt: `Атмосферный кадр ${index + 1}: ${scene.toLocaleLowerCase('ru-RU')}`,
			index,
			url: createImage(scene, palette, index)
		})),
		id,
		originalTitle,
		posterUrl: createImage('Кино, которое ты узнал', palette, 0, true),
		releaseYear,
		title
	}
}

export const FIXTURE_MOVIES: CatalogMovie[] = [
	createMovie(
		'm01',
		'Интерстеллар',
		'Interstellar',
		2014,
		['Интерстеллар', 'Interstellar'],
		[
			'Пыль над кукурузным полем',
			'Станция у далёкой планеты',
			'Ледяной горизонт',
			'Свет вокруг чёрной дыры',
			'Время течёт иначе',
			'Космонавт возвращается домой'
		],
		PALETTES[0]
	),
	createMovie(
		'm02',
		'Матрица',
		'The Matrix',
		1999,
		['Матрица', 'The Matrix', 'Matrix'],
		[
			'Зелёный свет в тёмной комнате',
			'Телефонная будка ночью',
			'Красная и синяя капсулы',
			'Погоня по крышам',
			'Цифровой дождь',
			'Герой останавливает пули'
		],
		PALETTES[1]
	),
	createMovie(
		'm03',
		'Унесённые призраками',
		'Spirited Away',
		2001,
		['Унесенные призраками', 'Унесённые призраками', 'Spirited Away'],
		[
			'Туннель в летний день',
			'Пустой город духов',
			'Поезд идёт по воде',
			'Баня под фонарями',
			'Безликий гость',
			'Девочка и белый дракон'
		],
		PALETTES[2]
	)
]

export const FIXTURE_COLLECTIONS: MovieCollectionSummary[] = [
	{
		description: 'Фильмы TMDB, ранжированные по известности',
		id: 'tmdb-catalog',
		movieCount: FIXTURE_MOVIES.length,
		title: 'Каталог TMDB'
	}
]

export function toMovieResult(movie: CatalogMovie): GameResult {
	return {
		originalTitle: movie.originalTitle,
		posterUrl: movie.posterUrl,
		releaseYear: movie.releaseYear,
		title: movie.title
	}
}

export function toMovieSuggestion(movie: CatalogMovie): MovieSuggestion {
	return {
		englishTitle: movie.originalTitle,
		id: movie.id,
		releaseYear: movie.releaseYear,
		title: movie.title
	}
}
