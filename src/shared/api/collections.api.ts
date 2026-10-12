import type { MovieCollectionSummary } from '@shared/types/game'

import { getTmdbCollection } from './tmdb'

export async function getCollections(): Promise<MovieCollectionSummary[]> {
	return [await getTmdbCollection()]
}
