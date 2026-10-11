import { computed, ref } from 'vue'

import type { MovieSuggestion } from '@shared/types/game'

import { searchMovies } from '../api/movies.api'

export function useMovieSearch() {
	const answer = ref<MovieSuggestion | string | null>(null)
	const attemptedMovieIds = ref<string[]>([])
	const isSearching = ref(false)
	const suggestions = ref<MovieSuggestion[]>([])
	let latestSearchId = 0

	const selectedMovie = computed<MovieSuggestion | null>(() =>
		typeof answer.value === 'object' && answer.value !== null ? answer.value : null
	)

	function clearSearch(): void {
		answer.value = null
		suggestions.value = []
		isSearching.value = false
		latestSearchId += 1
	}

	function markMovieAttempted(movieId: string): void {
		if (!attemptedMovieIds.value.includes(movieId)) {
			attemptedMovieIds.value.push(movieId)
		}
	}

	function resetSearch(): void {
		clearSearch()
		attemptedMovieIds.value = []
	}

	async function completeSearch(query: string): Promise<void> {
		if (query.trim().length < 2) {
			suggestions.value = []
			return
		}

		const searchId = ++latestSearchId
		isSearching.value = true

		try {
			const results = await searchMovies(query)

			if (searchId === latestSearchId) {
				suggestions.value = results
			}
		} catch {
			if (searchId === latestSearchId) {
				suggestions.value = []
			}
		} finally {
			if (searchId === latestSearchId) {
				isSearching.value = false
			}
		}
	}

	return {
		answer,
		attemptedMovieIds,
		clearSearch,
		completeSearch,
		isSearching,
		markMovieAttempted,
		resetSearch,
		selectedMovie,
		suggestions
	}
}
