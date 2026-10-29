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

export type RoomStatus = 'closed' | 'error' | 'finished' | 'loading' | 'playing' | 'round-result' | 'waiting'
export type PlayerRoundStatus = 'lost' | 'playing' | 'won'

export interface RoomRoundResult {
	roundId: string
	roundNumber: number
	outcome: 'won' | 'lost'
	readyPlayerIds: string[]
	requiredPlayerIds: string[]
	isReady: boolean
	canContinue: boolean
	isLastRound: boolean
}

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
	view: 'member'
	version: number
	serverTime: number
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
	roundResult: RoomRoundResult | null
}

export interface LobbyPreview extends LobbySummary {
	view: 'preview'
	status: RoomStatus
}

export type RoomView = LobbyPreview | RoomSnapshot

export interface MultiplayerApi {
	listRooms: () => Promise<LobbySummary[]>
	getRoom: (roomId: string) => Promise<RoomView>
	createRoom: (settings: LobbySettings, nickname: string, password: string) => Promise<string>
	joinRoom: (roomId: string, nickname: string, password: string) => Promise<void>
	startRoom: (roomId: string) => Promise<void>
	submitGuess: (roomId: string, roundId: string, movieId: string, frameIndex: number) => Promise<void>
	skipFrame: (roomId: string, roundId: string, frameIndex: number) => Promise<void>
	readyRoom: (roomId: string, roundId: string) => Promise<void>
	leaveRoom: (roomId: string) => Promise<void>
	retryPreparation: (roomId: string) => Promise<void>
}
