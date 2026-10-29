import type { GameDifficulty } from '@shared/types/game'

export interface DifficultyOption {
	label: string
	value: GameDifficulty
}
export const DIFFICULTY_OPTIONS: readonly DifficultyOption[] = [
	{ label: 'Easy', value: 'easy' },
	{ label: 'Medium', value: 'medium' },
	{ label: 'Hard', value: 'hard' },
	{ label: 'Expert', value: 'expert' },
	{ label: 'Impossible', value: 'impossible' }
]
export function isGameDifficulty(value: unknown): value is GameDifficulty {
	return DIFFICULTY_OPTIONS.some((option) => option.value === value)
}
export function getDifficultyOption(difficulty: GameDifficulty): DifficultyOption {
	const option = DIFFICULTY_OPTIONS.find((item) => item.value === difficulty)
	if (!option) throw new Error('Unknown difficulty')
	return option
}
export function getNextDifficulty(difficulty: GameDifficulty): GameDifficulty {
	return DIFFICULTY_OPTIONS[DIFFICULTY_OPTIONS.findIndex((item) => item.value === difficulty) + 1]?.value ?? 'easy'
}
