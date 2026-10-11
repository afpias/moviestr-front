import { describe, expect, it } from 'vitest'

import { getSavedGame, saveGame } from '@shared/lib/game-persistence'

describe('game persistence', () => {
	it('сохраняет идентификатор раунда и выбранный жанр', () => {
		saveGame('game-42', 'thriller')

		expect(getSavedGame()).toEqual({ gameId: 'game-42', genre: 'thriller', version: 2 })
	})

	it('отбрасывает состояние с неизвестным жанром', () => {
		window.localStorage.setItem('moviestr:game:v2', JSON.stringify({ gameId: 'game-42', genre: 'western', version: 2 }))

		expect(getSavedGame()).toBeNull()
		expect(window.localStorage.getItem('moviestr:game:v2')).toBeNull()
	})
})
