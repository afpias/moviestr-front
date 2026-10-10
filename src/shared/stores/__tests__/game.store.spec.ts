import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useGameStore } from '@shared/stores/game.store'

describe('game store', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('открывает следующий кадр после неверного ответа', async () => {
		const gameStore = useGameStore()

		await gameStore.startGame('top-250')
		const result = await gameStore.submitGuess('не тот фильм')

		expect(result).toBe(false)
		expect(gameStore.status).toBe('playing')
		expect(gameStore.currentFrame?.index).toBe(1)
	})

	it('завершает игру и очищает сохранённый раунд после верного ответа', async () => {
		const gameStore = useGameStore()

		await gameStore.startGame('top-250')
		await gameStore.submitGuess('Интерстеллар')

		expect(gameStore.status).toBe('won')
		expect(gameStore.points).toBe(600)
		expect(gameStore.result?.title).toBe('Интерстеллар')
		expect(window.localStorage.getItem('moviestr:game:v1')).toBeNull()
	})
})
