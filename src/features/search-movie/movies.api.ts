import { requestJson } from '@shared/api/client'
import { isNumber, isRecord, isString } from '@shared/lib/type-guards'
import type { MovieSuggestion } from '@shared/types/game'

function isMovieSuggestion(value: unknown): value is MovieSuggestion {
	return (
		isRecord(value) && isString(value.englishTitle) && isString(value.id) && isNumber(value.releaseYear) && isString(value.title)
	)
}

function isSuggestionsResponse(value: unknown): value is { items: MovieSuggestion[] } {
	return isRecord(value) && Array.isArray(value.items) && value.items.every(isMovieSuggestion)
}

export async function searchMovies(query: string): Promise<MovieSuggestion[]> {
	const response = await requestJson(
		`/movies/suggestions?q=${encodeURIComponent(query)}`,
		{ method: 'GET' },
		isSuggestionsResponse
	)

	return response.items
}
