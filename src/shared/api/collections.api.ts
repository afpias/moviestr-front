import type { MovieCollectionSummary } from '@shared/types/game'

import { requestJson } from './client'
import { isCollectionsResponse } from './contract-guards'

export async function getCollections(): Promise<MovieCollectionSummary[]> {
	const response = await requestJson('/collections', { method: 'GET' }, isCollectionsResponse)

	return response.items
}
