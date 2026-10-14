import type { MultiplayerApi } from '@shared/types/multiplayer'

import { getRandomTmdbMovie } from '../tmdb'

import {
	createDemoAdapter,
	getDemoParticipantId,
	hashDemoPassword,
	notifyDemoChanges,
	subscribeDemoChanges
} from './demo-adapter'

export function createMultiplayerApi(): MultiplayerApi {
	if (!navigator.locks || !crypto.randomUUID || !crypto.subtle) {
		throw new Error('Локальное демо требует localhost или HTTPS и браузер с Web Locks.')
	}
	return createDemoAdapter({
		participantId: getDemoParticipantId(),
		storage: window.localStorage,
		exclusive: async (operation) => {
			if (!navigator.locks) {
				throw new Error('Локальное демо требует localhost или HTTPS и браузер с Web Locks.')
			}
			return navigator.locks.request('moviestr:multiplayer:demo', operation)
		},
		loadMovie: (settings) => getRandomTmdbMovie(settings.difficulty, settings.genre),
		hashPassword: hashDemoPassword,
		now: () => Date.now(),
		newId: () => crypto.randomUUID(),
		onChange: subscribeDemoChanges,
		notify: notifyDemoChanges
	})
}
