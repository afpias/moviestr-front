import { readStorage, writeStorage } from './browser-storage'
import { isNumber, isRecord, isString } from './type-guards'

const GAME_STORAGE_KEY = 'moviestr:game:v1'

interface SavedGame {
	gameId: string
	version: 1
}

function isSavedGame(value: unknown): value is SavedGame {
	return isRecord(value) && isString(value.gameId) && isNumber(value.version) && value.version === 1
}

export function getSavedGameId(): string | null {
	return readStorage(GAME_STORAGE_KEY, isSavedGame)?.gameId ?? null
}

export function saveGameId(gameId: string): void {
	writeStorage<SavedGame>(GAME_STORAGE_KEY, { gameId, version: 1 })
}

export function clearSavedGame(): void {
	window.localStorage.removeItem(GAME_STORAGE_KEY)
}
