import type { MovieSuggestion } from '@shared/types/game'

import { requestJson } from './client'
import { isSuggestionsResponse } from './contract-guards'

export async function searchMovies(query: string): Promise<MovieSuggestion[]> {
	const response = await requestJson(
		`/movies/suggestions?q=${encodeURIComponent(query)}`,
		{ method: 'GET' },
		isSuggestionsResponse
	)

	return response.items
}
