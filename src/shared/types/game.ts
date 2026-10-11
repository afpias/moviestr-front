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
	id: string
	releaseYear: number
	title: string
}

export type GameDifficulty = 'easy' | 'expert' | 'hard' | 'impossible' | 'medium'

export interface PlayingGameResponse {
	currentFrame: GameFrame
	difficulty: GameDifficulty
	gameId: string
	status: 'playing'
	totalFrames: 6
}

export interface FinishedGameResponse {
	difficulty: GameDifficulty
	gameId: string
	result: GameResult
	status: 'lost' | 'won'
	totalFrames: 6
}

export type GameResponse = FinishedGameResponse | PlayingGameResponse

export type SubmitGuessResponse =
	| {
			correct: false
			currentFrame: GameFrame
			status: 'playing'
	  }
	| {
			correct: boolean
			result: GameResult
			status: 'lost' | 'won'
	  }

export type SkipFrameResponse =
	| {
			currentFrame: GameFrame
			status: 'playing'
	  }
	| {
			result: GameResult
			status: 'lost'
	  }

export type GameStatus = 'error' | 'idle' | 'loading' | 'lost' | 'playing' | 'submitting' | 'won'
