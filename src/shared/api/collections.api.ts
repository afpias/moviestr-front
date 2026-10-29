import type { MovieCollectionSummary } from '@shared/types/game'

import { parseCollections } from './contracts'
import { request } from './http'

export async function getCollections(): Promise<MovieCollectionSummary[]> {
	return parseCollections(await request('/collections'))
}
