import type { GameDifficulty, GameGenre } from '@shared/types/game'

import { readStorage, writeStorage } from './browser-storage'
import { isGameDifficulty } from './game-difficulty'
import { isGameGenre } from './game-genres'
import { isRecord } from './type-guards'

export interface GamePreferences {
	version: 1
	difficulty: GameDifficulty
	genre: GameGenre
}
const key = 'moviestr:game-preferences:v1'
export function getGamePreferences(): GamePreferences | null {
	return readStorage(
		key,
		(value): value is GamePreferences =>
			isRecord(value) && value.version === 1 && isGameDifficulty(value.difficulty) && isGameGenre(value.genre)
	)
}
export function saveGamePreferences(difficulty: GameDifficulty, genre: GameGenre): void {
	writeStorage<GamePreferences>(key, { version: 1, difficulty, genre })
}
