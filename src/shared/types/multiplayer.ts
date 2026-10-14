import type { GameDifficulty, GameFrame, GameGenre, GameResult } from './game'

export interface LobbySettings {
	name: string
	capacity: number
	filmCount: number
	difficulty: GameDifficulty
	genre: GameGenre
	mode: 'points'
	visibility: 'private' | 'public'
}

export type RoomStatus = 'closed' | 'error' | 'finished' | 'loading' | 'playing' | 'waiting'
export type PlayerRoundStatus = 'lost' | 'playing' | 'won'

export interface RoomPlayer {
	id: string
	nickname: string
	score: number
	status: PlayerRoundStatus
	lastAnswer: 'correct' | 'incorrect' | null
	connected: boolean
	left: boolean
}

export interface LobbySummary {
	id: string
	settings: LobbySettings
	playerCount: number
	hasPassword: boolean
}

export interface RoomSnapshot {
	id: string
	settings: LobbySettings
	hostId: string
	players: RoomPlayer[]
	status: RoomStatus
	roundId: string
	roundNumber: number
	deadline: number | null
	currentFrame: GameFrame | null
	attemptedMovieIds: string[]
	winnerIds: string[]
	error: string | null
	result: GameResult | null
}

export interface MultiplayerApi {
	participantId: string
	listRooms: () => LobbySummary[]
	getRoom: (roomId: string) => RoomSnapshot | null
	createRoom: (settings: LobbySettings, nickname: string, password: string) => Promise<string>
	joinRoom: (roomId: string, nickname: string, password: string) => Promise<void>
	startRoom: (roomId: string) => Promise<void>
	submitGuess: (roomId: string, roundId: string, movieId: string) => Promise<void>
	skipFrame: (roomId: string, roundId: string, frameIndex: number) => Promise<void>
	leaveRoom: (roomId: string) => Promise<void>
	heartbeat: (roomId: string) => Promise<void>
	prepareMovie: (roomId: string) => Promise<void>
	retryPreparation: (roomId: string) => Promise<void>
	subscribe: (callback: () => void) => () => void
}
