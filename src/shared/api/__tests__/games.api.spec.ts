import { describe, expect, it } from 'vitest'

import { getCollections } from '@shared/api/collections.api'
import { startGame, submitGuess } from '@shared/api/games.api'
import { searchMovies } from '@shared/api/movies.api'

describe('game API', () => {
	it('возвращает фактический размер mock-подборки', async () => {
		const collections = await getCollections()

		expect(collections).toEqual([expect.objectContaining({ id: 'top-250', movieCount: 3, title: 'Топ 250' })])
	})

	it('создаёт игру без раскрытия правильного ответа', async () => {
		const game = await startGame('top-250', 'hard')

		expect(game.status).toBe('playing')
		expect(game.difficulty).toBe('hard')
		expect(game).not.toHaveProperty('result')
		expect(game).not.toHaveProperty('movieId')
	})

	it('проверяет нормализованный ответ без начисления очков', async () => {
		const game = await startGame('top-250', 'easy')
		const response = await submitGuess(game.gameId, '  ИНТЕРСТЕЛЛАР! ')

		expect(response).toEqual(expect.objectContaining({ correct: true, status: 'won' }))
		expect(response).not.toHaveProperty('points')
	})

	it('ищет фильмы для автодополнения', async () => {
		const suggestions = await searchMovies('матр')

		expect(suggestions).toEqual([expect.objectContaining({ title: 'Матрица' })])
	})
})
