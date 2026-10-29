export interface MovieCollectionSummary {
	description: string
	id: string
	movieCount: number
	title: string
}

export interface GameFrame {
	alt: string
	index: number
	url: string
}

export interface GameResult {
	originalTitle: string
	posterUrl: string
	releaseYear: number
	title: string
}

export interface MovieSuggestion {
	englishTitle: string
	id: string
	releaseYear: number
	title: string
}

export type GameDifficulty = 'easy' | 'expert' | 'hard' | 'impossible' | 'medium'
export type GameGenre = 'action' | 'all' | 'animation' | 'comedy' | 'drama' | 'horror' | 'science-fiction' | 'thriller'

export interface PlayingGameResponse {
	attemptedMovieIds: string[]
	version: number
	serverTime: number
	currentFrame: GameFrame
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	status: 'playing'
	totalFrames: 5
}

export interface FinishedGameResponse {
	attemptedMovieIds: string[]
	version: number
	serverTime: number
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	result: GameResult
	status: 'lost' | 'won'
	totalFrames: 5
}

export interface PreparingGameResponse {
	attemptedMovieIds: string[]
	version: number
	serverTime: number
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	totalFrames: 5
	status: 'error' | 'loading'
	operationId: string
	error: string | null
}

export interface PendingGame {
	gameId: string
	operationId: string
	status: 'loading'
	version: number
	serverTime: number
}

export type GameResponse = FinishedGameResponse | PlayingGameResponse | PreparingGameResponse

export type SubmitGuessResponse = (FinishedGameResponse | PlayingGameResponse) & { correct: boolean }

export type SkipFrameResponse = GameResponse

export type GameStatus = 'error' | 'idle' | 'loading' | 'lost' | 'playing' | 'submitting' | 'won'
