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
	currentFrame: GameFrame
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	status: 'playing'
	totalFrames: 5
}

export interface FinishedGameResponse {
	difficulty: GameDifficulty
	gameId: string
	genre: GameGenre
	result: GameResult
	status: 'lost' | 'won'
	totalFrames: 5
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
