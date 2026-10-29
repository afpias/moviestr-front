import { describe, expect, it } from 'vitest'

import { getNextDifficulty, isGameDifficulty } from '@shared/lib/game-difficulty'

describe('difficulty UI navigation', () => {
	it('advances to next difficulty and restarts cycle after impossible', () => {
		expect(getNextDifficulty('easy')).toBe('medium')
		expect(getNextDifficulty('medium')).toBe('hard')
		expect(getNextDifficulty('hard')).toBe('expert')
		expect(getNextDifficulty('expert')).toBe('impossible')
		expect(getNextDifficulty('impossible')).toBe('easy')
	})
	it('rejects unknown stored values', () => {
		expect(isGameDifficulty('easy')).toBe(true)
		expect(isGameDifficulty('legendary')).toBe(false)
	})
})
