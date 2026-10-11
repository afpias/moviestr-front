import { describe, expect, it } from 'vitest'

import { getNextDifficulty, getRandomRankForDifficulty } from '@shared/lib/game-difficulty'
import type { GameDifficulty } from '@shared/types/game'

describe('game difficulty', () => {
	it.each<[GameDifficulty, number, number]>([
		['easy', 1, 50],
		['medium', 51, 100],
		['hard', 101, 150],
		['expert', 151, 200],
		['impossible', 201, 250]
	])('ограничивает режим %s позициями %i–%i', (difficulty, startRank, endRank) => {
		expect(getRandomRankForDifficulty(difficulty, 0)).toBe(startRank)
		expect(getRandomRankForDifficulty(difficulty, 0.999_999)).toBe(endRank)
	})

	it('повышает сложность и начинает цикл заново после impossible', () => {
		expect(getNextDifficulty('easy')).toBe('medium')
		expect(getNextDifficulty('medium')).toBe('hard')
		expect(getNextDifficulty('hard')).toBe('expert')
		expect(getNextDifficulty('expert')).toBe('impossible')
		expect(getNextDifficulty('impossible')).toBe('easy')
	})
})
