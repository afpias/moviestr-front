import { describe, expect, it } from 'vitest'

import { GAME_GENRE_OPTIONS, getGameGenreOption, isGameGenre } from '@shared/lib/game-genres'

describe('game genres', () => {
	it('содержит восемь доступных вариантов', () => {
		expect(GAME_GENRE_OPTIONS).toHaveLength(8)
		expect(GAME_GENRE_OPTIONS[0]).toEqual({ label: 'Все жанры', tmdbId: null, value: 'all' })
	})

	it('связывает жанр с идентификатором TMDB', () => {
		expect(getGameGenreOption('science-fiction').tmdbId).toBe(878)
		expect(getGameGenreOption('animation').tmdbId).toBe(16)
	})

	it('проверяет значение жанра', () => {
		expect(isGameGenre('thriller')).toBe(true)
		expect(isGameGenre('western')).toBe(false)
	})
})
