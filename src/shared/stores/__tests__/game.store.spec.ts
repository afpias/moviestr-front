import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useGameStore } from '@shared/stores/game.store'

describe('game store', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('автоматически открывает easy при первом входе', async () => {
		const gameStore = useGameStore()

		await gameStore.initializeGame()

		expect(gameStore.status).toBe('playing')
		expect(gameStore.difficulty).toBe('easy')
		expect(gameStore.currentFrame?.index).toBe(0)
	})

	it('открывает следующий кадр без ответа', async () => {
		const gameStore = useGameStore()

		await gameStore.initializeGame()
		await gameStore.skipFrame()

		expect(gameStore.status).toBe('playing')
		expect(gameStore.currentFrame?.index).toBe(1)
	})

	it('сразу переключается на выбранную сложность', async () => {
		const gameStore = useGameStore()

		await gameStore.initializeGame()
		await gameStore.switchDifficulty('hard')

		expect(gameStore.difficulty).toBe('hard')
		expect(gameStore.currentFrame?.index).toBe(0)
	})

	it('повышает сложность после верного ответа', async () => {
		const gameStore = useGameStore()

		await gameStore.initializeGame()
		const result = await gameStore.submitGuess('Интерстеллар')

		expect(result).toBe(true)
		expect(gameStore.status).toBe('playing')
		expect(gameStore.difficulty).toBe('medium')
		expect(gameStore.currentFrame?.index).toBe(0)
	})

	it('начинает цикл с easy после верного ответа в impossible', async () => {
		const gameStore = useGameStore()

		await gameStore.switchDifficulty('impossible')
		await gameStore.submitGuess('Интерстеллар')

		expect(gameStore.status).toBe('playing')
		expect(gameStore.difficulty).toBe('easy')
		expect(gameStore.currentFrame?.index).toBe(0)
	})

	it('заменяет фильм после пропуска последнего кадра', async () => {
		const gameStore = useGameStore()

		await gameStore.initializeGame()

		for (let frame = 0; frame < 6; frame += 1) {
			await gameStore.skipFrame()
		}

		expect(gameStore.status).toBe('playing')
		expect(gameStore.difficulty).toBe('easy')
		expect(gameStore.currentFrame?.index).toBe(0)
	})
})
