import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'

import { useMovieSearch } from '@features/search-movie'
import { useGameStore } from '@shared/stores/game.store'
import type { GameDifficulty, GameGenre } from '@shared/types/game'

export function useGameConsole() {
	const gameStore = useGameStore()
	const { attemptedMovieIds, currentFrame, genre, lastError, roundResult, status, totalFrames } = storeToRefs(gameStore)
	const difficulty = computed(() => (gameStore.preferencesReady ? gameStore.difficulty : null))
	const { answer, clearSearch, completeSearch, isSearching, resetSearch, selectedMovie, suggestions } = useMovieSearch()

	const currentAttempt = computed(() => (currentFrame.value ? currentFrame.value.index + 1 : null))
	const isBusy = computed(() => status.value === 'idle' || status.value === 'loading' || status.value === 'submitting')
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

		resetSearch()
		await gameStore.switchDifficulty(selectedDifficulty)
	}

	async function selectGenre(selectedGenre: GameGenre): Promise<void> {
		if (isBusy.value || selectedGenre === genre.value) {
			return
		}

		resetSearch()
		await gameStore.switchGenre(selectedGenre)
	}

	async function restartRound(): Promise<void> {
		if (isBusy.value) {
			return
		}

		resetSearch()
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

		if ((await gameStore.submitGuess(movie.id)) !== null) clearSearch()
	}

	async function continueRound(): Promise<void> {
		resetSearch()
		await gameStore.continueAfterWin()
	}

	async function retryRound(): Promise<void> {
		resetSearch()
		await gameStore.retryAfterLoss()
	}

	async function retryLoading(): Promise<void> {
		await gameStore.retryLoading()
	}

	watch(
		difficulty,
		(value) => {
			if (value) document.documentElement.dataset.gameDifficulty = value
			else document.documentElement.dataset.gameDifficulty = 'loading'
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
		attemptedMovieIds,
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
