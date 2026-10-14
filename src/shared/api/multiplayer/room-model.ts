import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isGameGenre } from '@shared/lib/game-genres'
import type { GameFrame, GameResult } from '@shared/types/game'
import type { LobbySettings, LobbySummary, PlayerRoundStatus, RoomSnapshot, RoomStatus } from '@shared/types/multiplayer'

export const ROUND_DURATION_MS = 90_000
export const RECONNECT_GRACE_MS = 30_000
export const INITIAL_SCORE = 1000
export const CORRECT_REWARD = 100
export const WRONG_PENALTY = 50

export interface RoomMovie extends GameResult {
	id: string
	frames: GameFrame[]
}

export interface DemoPlayer {
	id: string
	nickname: string
	score: number
	status: PlayerRoundStatus
	frameIndex: number
	attemptedMovieIds: string[]
	lastAnswer: 'correct' | 'incorrect' | null
	lastSeen: number
	left: boolean
}

export interface DemoRoom {
	id: string
	settings: LobbySettings
	passwordHash: string | null
	hostId: string
	players: DemoPlayer[]
	status: RoomStatus
	roundId: string
	roundNumber: number
	deadline: number | null
	movie: RoomMovie | null
	usedMovieIds: string[]
	loadingSince: number
	loaderId: string | null
	error: string | null
	updatedAt: number
}

export function validateSettings(settings: LobbySettings): void {
	if (
		settings.name.trim().length < 2 ||
		settings.name.trim().length > 60 ||
		!Number.isInteger(settings.capacity) ||
		settings.capacity < 2 ||
		settings.capacity > 4 ||
		!Number.isInteger(settings.filmCount) ||
		settings.filmCount < 1 ||
		settings.filmCount > 50 ||
		!isGameDifficulty(settings.difficulty) ||
		!isGameGenre(settings.genre) ||
		settings.mode !== 'points' ||
		!['private', 'public'].includes(settings.visibility)
	) {
		throw new Error('Проверь название, число участников и количество фильмов.')
	}
}

export function createPlayer(id: string, nickname: string, now: number): DemoPlayer {
	const name = nickname.trim()
	if (name.length < 2 || name.length > 24) {
		throw new Error('Никнейм должен содержать от 2 до 24 символов.')
	}
	return {
		id,
		nickname: name,
		score: INITIAL_SCORE,
		status: 'playing',
		frameIndex: 0,
		attemptedMovieIds: [],
		lastAnswer: null,
		lastSeen: now,
		left: false
	}
}

export function requirePlayer(room: DemoRoom, participantId: string): DemoPlayer {
	const player = room.players.find((candidate) => candidate.id === participantId && !candidate.left)
	if (!player) {
		throw new Error('Сначала присоединись к комнате.')
	}
	return player
}

export function requireHost(room: DemoRoom, participantId: string): void {
	requirePlayer(room, participantId)
	if (room.hostId !== participantId) {
		throw new Error('Это действие доступно только хосту.')
	}
}

export function isConnected(player: DemoPlayer, now: number): boolean {
	return !player.left && now - player.lastSeen <= RECONNECT_GRACE_MS
}

export function joinPlayer(room: DemoRoom, participantId: string, nickname: string, now: number): void {
	const existing = room.players.find((player) => player.id === participantId && !player.left)
	if (existing && room.status !== 'closed') {
		existing.lastSeen = now
		return
	}
	if (room.status !== 'waiting') {
		throw new Error('Игра уже началась или комната закрыта.')
	}
	if (room.players.length >= room.settings.capacity) {
		throw new Error('В комнате нет свободных мест.')
	}
	const player = createPlayer(participantId, nickname, now)
	if (
		room.players.some((candidate) => candidate.nickname.toLocaleLowerCase('ru-RU') === player.nickname.toLocaleLowerCase('ru-RU'))
	) {
		throw new Error('Этот никнейм уже занят в комнате.')
	}
	room.players.push(player)
}

function beginPreparation(room: DemoRoom): void {
	room.status = 'loading'
	room.deadline = null
	room.loadingSince = 0
	room.loaderId = null
	room.roundId = `${room.id}:${room.roundNumber}`
	room.error = null
	for (const player of room.players) {
		player.status = player.left ? 'lost' : 'playing'
		player.frameIndex = 0
		player.attemptedMovieIds = []
		player.lastAnswer = null
	}
}

export function startMatch(room: DemoRoom, participantId: string, now: number): void {
	requireHost(room, participantId)
	if (room.status !== 'waiting') {
		throw new Error('Матч уже начат.')
	}
	if (room.players.filter((player) => isConnected(player, now)).length < 2) {
		throw new Error('Для старта нужны хотя бы два подключённых участника.')
	}
	room.roundNumber = 1
	room.usedMovieIds = []
	for (const player of room.players) {
		player.score = INITIAL_SCORE
	}
	beginPreparation(room)
}

export function publishMovie(room: DemoRoom, movie: RoomMovie, now: number): void {
	if (movie.frames.length !== 5 || room.usedMovieIds.includes(movie.id)) {
		throw new Error('Нужен новый фильм с пятью кадрами.')
	}
	room.movie = movie
	room.usedMovieIds.push(movie.id)
	room.status = 'playing'
	room.deadline = now + ROUND_DURATION_MS
	room.loaderId = null
	room.error = null
}

export function advanceMatch(room: DemoRoom): void {
	if (room.status !== 'playing' || room.players.some((player) => player.status === 'playing')) {
		return
	}
	if (room.roundNumber >= room.settings.filmCount) {
		room.status = 'finished'
		room.deadline = null
		return
	}
	room.roundNumber += 1
	beginPreparation(room)
}

function requireActiveRound(room: DemoRoom, participantId: string, roundId: string): DemoPlayer | null {
	const player = requirePlayer(room, participantId)
	return room.status === 'playing' && room.roundId === roundId && player.status === 'playing' ? player : null
}

export function applyGuess(room: DemoRoom, participantId: string, roundId: string, movieId: string): void {
	const player = requireActiveRound(room, participantId, roundId)
	if (!player || !room.movie || player.attemptedMovieIds.includes(movieId)) {
		return
	}
	if (movieId === room.movie.id) {
		player.score += CORRECT_REWARD
		player.status = 'won'
		player.lastAnswer = 'correct'
	} else {
		player.attemptedMovieIds.push(movieId)
		player.score -= WRONG_PENALTY
		player.lastAnswer = 'incorrect'
		if (player.frameIndex >= 4) {
			player.status = 'lost'
		} else {
			player.frameIndex += 1
		}
	}
	advanceMatch(room)
}

export function applySkip(room: DemoRoom, participantId: string, roundId: string, frameIndex: number): void {
	const player = requireActiveRound(room, participantId, roundId)
	if (!player || player.frameIndex !== frameIndex) {
		return
	}
	if (player.frameIndex >= 4) {
		player.status = 'lost'
		player.score -= WRONG_PENALTY
		player.lastAnswer = 'incorrect'
	} else {
		player.frameIndex += 1
	}
	advanceMatch(room)
}

export function leavePlayer(room: DemoRoom, participantId: string, now: number): void {
	const player = requirePlayer(room, participantId)
	player.left = true
	if (room.status === 'waiting') {
		room.players = room.players.filter((candidate) => candidate.id !== participantId)
	} else if (player.status === 'playing') {
		player.status = 'lost'
		player.lastAnswer = 'incorrect'
		if (room.status === 'playing') {
			player.score -= WRONG_PENALTY
		}
	}
	tickRoom(room, now)
}

export function tickRoom(room: DemoRoom, now: number): void {
	if (room.status === 'closed') {
		return
	}
	if (room.status === 'waiting') {
		room.players = room.players.filter((player) => isConnected(player, now))
	}
	const connectedPlayers = room.players.filter((player) => isConnected(player, now))
	if (connectedPlayers.length === 0) {
		room.status = 'closed'
		room.deadline = null
		return
	}
	if (!connectedPlayers.some((player) => player.id === room.hostId)) {
		const successor = connectedPlayers[0]
		if (successor) {
			room.hostId = successor.id
		}
	}
	if (room.status === 'playing' && room.deadline !== null && now >= room.deadline) {
		for (const player of room.players) {
			if (player.status === 'playing') {
				player.score -= WRONG_PENALTY
				player.status = 'lost'
				player.lastAnswer = 'incorrect'
			}
		}
	}
	advanceMatch(room)
}

export function toLobbySummary(room: DemoRoom): LobbySummary {
	return {
		id: room.id,
		settings: { ...room.settings },
		playerCount: room.players.length,
		hasPassword: room.passwordHash !== null
	}
}

export function toRoomSnapshot(room: DemoRoom, participantId: string, now: number): RoomSnapshot {
	const me = room.players.find((player) => player.id === participantId && !player.left)
	const maximumScore = Math.max(...room.players.map((player) => player.score))
	return {
		id: room.id,
		settings: { ...room.settings },
		hostId: room.hostId,
		status: room.status,
		roundId: room.roundId,
		roundNumber: room.roundNumber,
		deadline: room.deadline,
		players: room.players.map((player) => ({
			id: player.id,
			nickname: player.nickname,
			score: player.score,
			status: player.status,
			lastAnswer: player.lastAnswer,
			connected: isConnected(player, now),
			left: player.left
		})),
		currentFrame: room.status === 'playing' && me ? (room.movie?.frames[me.frameIndex] ?? null) : null,
		attemptedMovieIds: me ? [...me.attemptedMovieIds] : [],
		winnerIds:
			room.status === 'finished' ? room.players.filter((player) => player.score === maximumScore).map((player) => player.id) : [],
		error: room.error,
		result:
			room.status === 'finished' && room.movie
				? {
						title: room.movie.title,
						originalTitle: room.movie.originalTitle,
						posterUrl: room.movie.posterUrl,
						releaseYear: room.movie.releaseYear
					}
				: null
	}
}
