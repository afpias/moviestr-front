import type { GameGenre } from '@shared/types/game'

import { readStorage, writeStorage } from './browser-storage'
import { isGameGenre } from './game-genres'
import { isNumber, isRecord, isString } from './type-guards'

const GAME_STORAGE_KEY = 'moviestr:game:v2'
const LEGACY_GAME_STORAGE_KEY = 'moviestr:game:v1'

export interface SavedGame {
	gameId: string
	genre: GameGenre
	version: 2
}

function isSavedGame(value: unknown): value is SavedGame {
	return isRecord(value) && isString(value.gameId) && isGameGenre(value.genre) && isNumber(value.version) && value.version === 2
}

export function getSavedGame(): SavedGame | null {
	return readStorage(GAME_STORAGE_KEY, isSavedGame)
}

export function saveGame(gameId: string, genre: GameGenre): void {
	writeStorage<SavedGame>(GAME_STORAGE_KEY, { gameId, genre, version: 2 })
	window.localStorage.removeItem(LEGACY_GAME_STORAGE_KEY)
}

export function clearSavedGame(): void {
	window.localStorage.removeItem(GAME_STORAGE_KEY)
	window.localStorage.removeItem(LEGACY_GAME_STORAGE_KEY)
}
