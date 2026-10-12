import { searchTmdbCatalog } from '@shared/api/tmdb'
import type { MovieSuggestion } from '@shared/types/game'

export async function searchMovies(query: string): Promise<MovieSuggestion[]> {
	return searchTmdbCatalog(query)
}
