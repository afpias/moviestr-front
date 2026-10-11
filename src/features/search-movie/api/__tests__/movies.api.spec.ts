import { describe, expect, it } from 'vitest'

import { searchMovies } from '../movies.api'

describe('movie search API', () => {
	it('ищет фильмы по русскому названию', async () => {
		const suggestions = await searchMovies('матр')

		expect(suggestions).toEqual([expect.objectContaining({ englishTitle: 'The Matrix', title: 'Матрица' })])
	})

	it('ищет фильмы по английскому названию', async () => {
		const suggestions = await searchMovies('matrix')

		expect(suggestions).toEqual([expect.objectContaining({ englishTitle: 'The Matrix', title: 'Матрица' })])
	})
})
