import { describe, expect, it } from 'vitest'

import { useMovieSearch } from '../useMovieSearch'

describe('movie search state', () => {
	it('сохраняет попытки при очистке поля и сбрасывает для нового раунда', () => {
		const movieSearch = useMovieSearch()

		movieSearch.markMovieAttempted('tmdb-603')
		movieSearch.clearSearch()

		expect(movieSearch.attemptedMovieIds.value).toEqual(['tmdb-603'])

		movieSearch.resetSearch()

		expect(movieSearch.attemptedMovieIds.value).toEqual([])
	})

	it('не добавляет один фильм в историю повторно', () => {
		const movieSearch = useMovieSearch()

		movieSearch.markMovieAttempted('tmdb-603')
		movieSearch.markMovieAttempted('tmdb-603')

		expect(movieSearch.attemptedMovieIds.value).toEqual(['tmdb-603'])
	})
})
