import type { GameDifficulty } from '@shared/types/game'

export interface DifficultyOption {
	description: string
	endRank: number
	label: string
	startRank: number
	value: GameDifficulty
}

export const DIFFICULTY_OPTIONS: readonly DifficultyOption[] = [
	{ description: 'Самые известные фильмы', endRank: 50, label: 'Easy', startRank: 1, value: 'easy' },
	{ description: 'Знакомая классика и хиты', endRank: 100, label: 'Medium', startRank: 51, value: 'medium' },
	{ description: 'Для уверенных киноманов', endRank: 150, label: 'Hard', startRank: 101, value: 'hard' },
	{ description: 'Редкие позиции рейтинга', endRank: 200, label: 'Expert', startRank: 151, value: 'expert' },
	{ description: 'Самая сложная часть топа', endRank: 250, label: 'Impossible', startRank: 201, value: 'impossible' }
]

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

export function getRandomRankForDifficulty(difficulty: GameDifficulty, randomValue = Math.random()): number {
	const { endRank, startRank } = getDifficultyOption(difficulty)
	const rangeSize = endRank - startRank + 1

	return startRank + Math.floor(randomValue * rangeSize)
}
