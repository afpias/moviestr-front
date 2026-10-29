import { computed, watch } from 'vue'

import { readyRoomRound, skipRoomFrame, submitRoomGuess } from '@features/play-multiplayer'
import { useMovieSearch } from '@features/search-movie'
import { useMultiplayerStore } from '@shared/stores/multiplayer.store'

export function useRoomConsole() {
	const store = useMultiplayerStore()
	const { answer, clearSearch, completeSearch, isSearching, selectedMovie, suggestions } = useMovieSearch()
	const canAnswer = computed(
		() => store.connection === 'connected' && store.room?.status === 'playing' && store.me?.status === 'playing'
	)
	const actionLabel = computed(() =>
		selectedMovie.value ? 'Угадать' : store.room?.currentFrame?.index === 4 ? 'Сдаться' : 'Пропустить'
	)
	const canContinue = computed(
		() =>
			store.connection === 'connected' &&
			!store.busy &&
			store.room?.status === 'round-result' &&
			store.room.roundResult?.canContinue === true &&
			!store.room.roundResult.isReady
	)

	watch([() => store.room?.roundId, () => store.room?.currentFrame?.index, () => store.me?.status], clearSearch)

	async function submit(): Promise<void> {
		if (!canAnswer.value || store.busy || !store.room) {
			return
		}
		const { id, roundId } = store.room
		if (selectedMovie.value) {
			await submitRoomGuess(id, roundId, selectedMovie.value.id)
		} else {
			await skipRoomFrame(id, roundId, store.room.currentFrame?.index ?? 0)
		}
		clearSearch()
	}

	async function continueRound(): Promise<void> {
		if (!canContinue.value || !store.room?.roundResult) return
		await readyRoomRound(store.room.id, store.room.roundResult.roundId)
	}

	return { store, answer, completeSearch, isSearching, suggestions, canAnswer, actionLabel, submit, canContinue, continueRound }
}
