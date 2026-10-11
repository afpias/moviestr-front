import type { GameDifficulty } from '@shared/types/game'

export interface DifficultyOption {
	endPercentile: number
	label: string
	startPercentile: number
	value: GameDifficulty
}

export const DIFFICULTY_OPTIONS: readonly DifficultyOption[] = [
	{ endPercentile: 0.1, label: 'Easy', startPercentile: 0, value: 'easy' },
	{ endPercentile: 0.3, label: 'Medium', startPercentile: 0.1, value: 'medium' },
	{ endPercentile: 0.55, label: 'Hard', startPercentile: 0.3, value: 'hard' },
	{ endPercentile: 0.8, label: 'Expert', startPercentile: 0.55, value: 'expert' },
	{ endPercentile: 1, label: 'Impossible', startPercentile: 0.8, value: 'impossible' }
]

export interface DifficultySlice {
	endIndex: number
	startIndex: number
}

export function isGameDifficulty(value: unknown): value is GameDifficulty {
	return DIFFICULTY_OPTIONS.some((option) => option.value === value)
}

export function getDifficultyOption(difficulty: GameDifficulty): DifficultyOption {
	const option = DIFFICULTY_OPTIONS.find((item) => item.value === difficulty)

	if (!option) {
		throw new Error(`Unknown game difficulty: ${difficulty}`)
	}

	return option
}

export function getNextDifficulty(difficulty: GameDifficulty): GameDifficulty {
	const currentIndex = DIFFICULTY_OPTIONS.findIndex((option) => option.value === difficulty)
	const nextOption = DIFFICULTY_OPTIONS[currentIndex + 1]

	return nextOption?.value ?? 'easy'
}

export function getDifficultySlice(difficulty: GameDifficulty, itemCount: number): DifficultySlice {
	const safeItemCount = Math.max(0, Math.floor(itemCount))
	const { endPercentile, startPercentile } = getDifficultyOption(difficulty)

	return {
		endIndex: Math.floor(safeItemCount * endPercentile),
		startIndex: Math.floor(safeItemCount * startPercentile)
	}
}
