import { removeStorage } from './browser-storage'
import { clearSavedGame, getSavedGame } from './game-persistence'

export function clearLegacyState(): void {
	for (const key of ['moviestr:game-sessions:v1', 'moviestr:multiplayer:guest:v1', 'moviestr:multiplayer:participant:v1'])
		removeStorage(key, 'session')
	for (const key of ['moviestr:multiplayer:demo:v1', 'moviestr:game:v1']) removeStorage(key)
	if (getSavedGame()?.gameId.startsWith('game-')) clearSavedGame()
}
