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

	it('применяет жанр и сохраняет его вместе с текущим раундом', async () => {
		const gameStore = useGameStore()

		await gameStore.initializeGame()
		await gameStore.switchGenre('thriller')

		expect(gameStore.genre).toBe('thriller')
		expect(window.localStorage.getItem('moviestr:game:v2')).toContain('"genre":"thriller"')
	})

	it('перезапускает раунд с easy и сохраняет выбранный жанр', async () => {
		const gameStore = useGameStore()

		await gameStore.switchGenre('horror')
		await gameStore.switchDifficulty('hard')
		await gameStore.restartRound()

		expect(gameStore.difficulty).toBe('easy')
		expect(gameStore.genre).toBe('horror')
		expect(gameStore.currentFrame?.index).toBe(0)
	})

	it('показывает результат победы и повышает сложность после продолжения', async () => {
		const gameStore = useGameStore()

		await gameStore.initializeGame()
		const result = await gameStore.submitGuess('Интерстеллар')

		expect(result).toBe(true)
		expect(gameStore.status).toBe('won')
		expect(gameStore.roundResult?.title).toBe('Интерстеллар')
		expect(gameStore.difficulty).toBe('easy')

		await gameStore.continueAfterWin()

		expect(gameStore.status).toBe('playing')
		expect(gameStore.difficulty).toBe('medium')
		expect(gameStore.currentFrame?.index).toBe(0)
	})

	it('начинает цикл с easy после верного ответа в impossible', async () => {
		const gameStore = useGameStore()

		await gameStore.switchGenre('horror')
		await gameStore.switchDifficulty('impossible')
		await gameStore.submitGuess('Матрица')

		expect(gameStore.status).toBe('won')
		expect(gameStore.difficulty).toBe('impossible')

		await gameStore.continueAfterWin()

		expect(gameStore.status).toBe('playing')
		expect(gameStore.difficulty).toBe('easy')
		expect(gameStore.genre).toBe('horror')
		expect(gameStore.currentFrame?.index).toBe(0)
	})

	it('восстанавливает текущий кадр и жанр из сохранённого раунда', async () => {
		const firstStore = useGameStore()
		await firstStore.switchGenre('drama')
		await firstStore.skipFrame()

		setActivePinia(createPinia())
		const restoredStore = useGameStore()
		await restoredStore.initializeGame()

		expect(restoredStore.status).toBe('playing')
		expect(restoredStore.genre).toBe('drama')
		expect(restoredStore.currentFrame?.index).toBe(1)
	})

	it('показывает поражение на пятом кадре и повторяет ту же сложность', async () => {
		const gameStore = useGameStore()

		await gameStore.switchDifficulty('hard')

		for (let frame = 0; frame < 5; frame += 1) {
			await gameStore.skipFrame()
		}

		expect(gameStore.status).toBe('lost')
		expect(gameStore.difficulty).toBe('hard')
		expect(gameStore.roundResult).not.toBeNull()

		await gameStore.retryAfterLoss()

		expect(gameStore.status).toBe('playing')
		expect(gameStore.difficulty).toBe('hard')
		expect(gameStore.currentFrame?.index).toBe(0)
	})
})
