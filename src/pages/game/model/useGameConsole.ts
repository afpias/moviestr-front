import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'

import { useMovieSearch } from '@features/search-movie'
import { useGameStore } from '@shared/stores/game.store'
import type { GameDifficulty, GameGenre } from '@shared/types/game'

export function useGameConsole() {
	const gameStore = useGameStore()
	const { currentFrame, difficulty, genre, lastError, roundResult, status, totalFrames } = storeToRefs(gameStore)
	const { answer, clearSearch, completeSearch, isSearching, selectedMovie, suggestions } = useMovieSearch()

	const currentAttempt = computed(() => (currentFrame.value?.index ?? 0) + 1)
	const isBusy = computed(() => status.value === 'loading' || status.value === 'submitting')
	const actionLabel = computed(() => {
		if (status.value === 'submitting') {
			return selectedMovie.value ? 'Проверяем…' : currentAttempt.value === totalFrames.value ? 'Сдаёмся…' : 'Открываем…'
		}

		return selectedMovie.value ? 'Угадать' : currentAttempt.value === totalFrames.value ? 'Сдаться' : 'Пропустить'
	})

	async function selectDifficulty(selectedDifficulty: GameDifficulty): Promise<void> {
		if (isBusy.value || selectedDifficulty === difficulty.value) {
			return
		}

		clearSearch()
		await gameStore.switchDifficulty(selectedDifficulty)
	}

	async function selectGenre(selectedGenre: GameGenre): Promise<void> {
		if (isBusy.value || selectedGenre === genre.value) {
			return
		}

		clearSearch()
		await gameStore.switchGenre(selectedGenre)
	}

	async function restartRound(): Promise<void> {
		if (isBusy.value) {
			return
		}

		clearSearch()
		await gameStore.restartRound()
	}

	async function submitAction(): Promise<void> {
		if (isBusy.value) {
			return
		}

		const movie = selectedMovie.value

		if (!movie) {
			await gameStore.skipFrame()
			clearSearch()
			return
		}

		await gameStore.submitGuess(movie.title)
		clearSearch()
	}

	async function continueRound(): Promise<void> {
		clearSearch()
		await gameStore.continueAfterWin()
	}

	async function retryRound(): Promise<void> {
		clearSearch()
		await gameStore.retryAfterLoss()
	}

	async function retryLoading(): Promise<void> {
		await gameStore.switchDifficulty(difficulty.value)
	}

	watch(
		difficulty,
		(value) => {
			document.documentElement.dataset.gameDifficulty = value
		},
		{ immediate: true }
	)

	onBeforeUnmount(() => {
		delete document.documentElement.dataset.gameDifficulty
	})

	onMounted(gameStore.initializeGame)

	return {
		actionLabel,
		answer,
		completeSearch,
		continueRound,
		currentAttempt,
		currentFrame,
		difficulty,
		genre,
		isBusy,
		isSearching,
		lastError,
		restartRound,
		retryLoading,
		retryRound,
		roundResult,
		selectDifficulty,
		selectGenre,
		status,
		submitAction,
		suggestions,
		totalFrames
	}
}
