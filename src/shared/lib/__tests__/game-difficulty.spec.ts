import { describe, expect, it } from 'vitest'

import { getDifficultySlice, getNextDifficulty } from '@shared/lib/game-difficulty'
import type { GameDifficulty } from '@shared/types/game'

describe('game difficulty', () => {
	it.each<[GameDifficulty, number, number]>([
		['easy', 0, 10],
		['medium', 10, 30],
		['hard', 30, 55],
		['expert', 55, 80],
		['impossible', 80, 100]
	])('ограничивает режим %s процентилем %i–%i', (difficulty, startIndex, endIndex) => {
		expect(getDifficultySlice(difficulty, 100)).toEqual({ endIndex, startIndex })
	})

	it('покрывает каталог из 10 000 фильмов без пересечений и пропусков', () => {
		const slices = (['easy', 'medium', 'hard', 'expert', 'impossible'] satisfies GameDifficulty[]).map((difficulty) =>
			getDifficultySlice(difficulty, 10_000)
		)

		expect(slices).toEqual([
			{ endIndex: 1_000, startIndex: 0 },
			{ endIndex: 3_000, startIndex: 1_000 },
			{ endIndex: 5_500, startIndex: 3_000 },
			{ endIndex: 8_000, startIndex: 5_500 },
			{ endIndex: 10_000, startIndex: 8_000 }
		])
	})

	it('повышает сложность и начинает цикл заново после impossible', () => {
		expect(getNextDifficulty('easy')).toBe('medium')
		expect(getNextDifficulty('medium')).toBe('hard')
		expect(getNextDifficulty('hard')).toBe('expert')
		expect(getNextDifficulty('expert')).toBe('impossible')
		expect(getNextDifficulty('impossible')).toBe('easy')
	})
})
