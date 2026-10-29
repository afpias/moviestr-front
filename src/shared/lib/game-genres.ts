import type { GameGenre } from '@shared/types/game'

export interface GameGenreOption {
	label: string
	value: GameGenre
}
export const GAME_GENRE_OPTIONS: readonly GameGenreOption[] = [
	{ label: 'Все жанры', value: 'all' },
	{ label: 'Боевик', value: 'action' },
	{ label: 'Комедия', value: 'comedy' },
	{ label: 'Драма', value: 'drama' },
	{ label: 'Триллер', value: 'thriller' },
	{ label: 'Ужасы', value: 'horror' },
	{ label: 'Фантастика', value: 'science-fiction' },
	{ label: 'Анимация', value: 'animation' }
]
export function isGameGenre(value: unknown): value is GameGenre {
	return GAME_GENRE_OPTIONS.some((option) => option.value === value)
}
export function getGameGenreOption(genre: GameGenre): GameGenreOption {
	const option = GAME_GENRE_OPTIONS.find((item) => item.value === genre)
	if (!option) throw new Error('Unknown genre')
	return option
}
