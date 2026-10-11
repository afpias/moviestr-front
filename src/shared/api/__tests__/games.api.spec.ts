import { describe, expect, it } from 'vitest'

import { getCollections } from '@shared/api/collections.api'
import { loadChallenge, skipFrame, submitGuess } from '@shared/api/games.api'
import { searchMovies } from '@shared/api/movies.api'

describe('game API', () => {
	it('возвращает фактический размер mock-подборки', async () => {
		const collections = await getCollections()

		expect(collections).toEqual([expect.objectContaining({ id: 'top-250', movieCount: 3, title: 'Известные фильмы' })])
	})

	it('загружает фильм режима без раскрытия правильного ответа', async () => {
		const game = await loadChallenge('top-250', 'hard', 'thriller')

		expect(game.status).toBe('playing')
		expect(game.difficulty).toBe('hard')
		expect(game.genre).toBe('thriller')
		expect(game.totalFrames).toBe(5)
		expect(game).not.toHaveProperty('result')
		expect(game).not.toHaveProperty('movieId')
	})

	it('проверяет нормализованный ответ без начисления очков', async () => {
		const game = await loadChallenge('top-250', 'easy')
		const response = await submitGuess(game.gameId, '  ИНТЕРСТЕЛЛАР! ')

		expect(response).toEqual(expect.objectContaining({ correct: true, status: 'won' }))
		expect(response).not.toHaveProperty('points')
	})

	it('принимает английское название как правильный ответ', async () => {
		const game = await loadChallenge('top-250', 'easy')
		const response = await submitGuess(game.gameId, '  INTERSTELLAR  ')

		expect(response).toEqual(expect.objectContaining({ correct: true, status: 'won' }))
	})

	it('пропускает ответ и открывает следующий кадр', async () => {
		const game = await loadChallenge('top-250', 'easy')
		const response = await skipFrame(game.gameId)

		expect(response).toEqual(expect.objectContaining({ currentFrame: expect.objectContaining({ index: 1 }), status: 'playing' }))
	})

	it('возвращает правильный ответ при сдаче на пятом кадре', async () => {
		const game = await loadChallenge('top-250', 'easy')

		for (let frame = 1; frame < 5; frame += 1) {
			await skipFrame(game.gameId)
		}

		const response = await skipFrame(game.gameId)

		expect(response).toEqual(
			expect.objectContaining({ result: expect.objectContaining({ title: 'Интерстеллар' }), status: 'lost' })
		)
	})

	it('ищет фильмы для автодополнения', async () => {
		const suggestions = await searchMovies('матр')

		expect(suggestions).toEqual([expect.objectContaining({ englishTitle: 'The Matrix', title: 'Матрица' })])
	})

	it('ищет фильмы по английскому названию', async () => {
		const suggestions = await searchMovies('matrix')

		expect(suggestions).toEqual([expect.objectContaining({ englishTitle: 'The Matrix', title: 'Матрица' })])
	})
})
