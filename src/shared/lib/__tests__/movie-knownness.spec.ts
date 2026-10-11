import { describe, expect, it } from 'vitest'

import { rankMoviesByKnownness } from '@shared/lib/movie-knownness'

describe('movie knownness', () => {
	it('ставит устойчивое количество оценок выше кратковременной популярности', () => {
		const rankedMovies = rankMoviesByKnownness([
			{ id: 'viral', popularity: 1_000, voteCount: 100 },
			{ id: 'classic', popularity: 200, voteCount: 20_000 },
			{ id: 'obscure', popularity: 10, voteCount: 20 }
		])

		expect(rankedMovies.map((movie) => movie.id)).toEqual(['classic', 'viral', 'obscure'])
	})

	it('не изменяет входной массив', () => {
		const movies = [
			{ id: 'first', popularity: 10, voteCount: 10 },
			{ id: 'second', popularity: 20, voteCount: 20 }
		]

		rankMoviesByKnownness(movies)

		expect(movies.map((movie) => movie.id)).toEqual(['first', 'second'])
	})
})
