import { parseSuggestions } from '@shared/api/contracts'
import { request } from '@shared/api/http'
import type { MovieSuggestion } from '@shared/types/game'

export async function searchMovies(query: string): Promise<MovieSuggestion[]> {
	return parseSuggestions(await request(`/movies/search?q=${encodeURIComponent(query.trim())}`))
}
