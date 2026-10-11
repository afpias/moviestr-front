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

	it('покрывает пул из 250 фильмов без пересечений и пропусков', () => {
		const slices = (['easy', 'medium', 'hard', 'expert', 'impossible'] satisfies GameDifficulty[]).map((difficulty) =>
			getDifficultySlice(difficulty, 250)
		)

		expect(slices).toEqual([
			{ endIndex: 25, startIndex: 0 },
			{ endIndex: 75, startIndex: 25 },
			{ endIndex: 137, startIndex: 75 },
			{ endIndex: 200, startIndex: 137 },
			{ endIndex: 250, startIndex: 200 }
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
