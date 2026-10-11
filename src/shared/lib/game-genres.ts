import type { GameGenre } from '@shared/types/game'

export interface GameGenreOption {
	label: string
	tmdbId: number | null
	value: GameGenre
}

export const GAME_GENRE_OPTIONS: readonly GameGenreOption[] = [
	{ label: 'Все жанры', tmdbId: null, value: 'all' },
	{ label: 'Боевик', tmdbId: 28, value: 'action' },
	{ label: 'Комедия', tmdbId: 35, value: 'comedy' },
	{ label: 'Драма', tmdbId: 18, value: 'drama' },
	{ label: 'Триллер', tmdbId: 53, value: 'thriller' },
	{ label: 'Ужасы', tmdbId: 27, value: 'horror' },
	{ label: 'Фантастика', tmdbId: 878, value: 'science-fiction' },
	{ label: 'Анимация', tmdbId: 16, value: 'animation' }
]

export function isGameGenre(value: unknown): value is GameGenre {
	return GAME_GENRE_OPTIONS.some((option) => option.value === value)
}

export function getGameGenreOption(genre: GameGenre): GameGenreOption {
	const option = GAME_GENRE_OPTIONS.find((item) => item.value === genre)

	if (!option) {
		throw new Error(`Unknown game genre: ${genre}`)
	}

	return option
}
