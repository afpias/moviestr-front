import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isGameGenre } from '@shared/lib/game-genres'
import { isRecord } from '@shared/lib/type-guards'
import type {
	GameFrame,
	GameResponse,
	GameResult,
	MovieCollectionSummary,
	MovieSuggestion,
	PendingGame,
	SubmitGuessResponse
} from '@shared/types/game'
import type { LobbySettings, LobbySummary, RoomPlayer, RoomRoundResult, RoomSnapshot, RoomView } from '@shared/types/multiplayer'

import { ApiError } from './api-error'

type Guard<T> = (value: unknown) => value is T
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)
const text = (v: unknown): v is string => typeof v === 'string'
const nullableText = (v: unknown) => v === null || text(v)
const movieId = (v: unknown): v is string => text(v) && /^tmdb-[1-9]\d{0,9}$/.test(v)
const uuid = (v: unknown): v is string => text(v) && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v)
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text)
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.every(movieId)
const keys = (v: object, names: string[]) => Object.keys(v).every((key) => names.includes(key))
const imageUrl = (v: unknown): v is string => text(v) && /^https:\/\/image\.tmdb\.org\/t\/p\/[\w/.-]+$/.test(v)
const frame: Guard<GameFrame> = (v): v is GameFrame =>
	isRecord(v) &&
	keys(v, ['alt', 'index', 'url']) &&
	text(v.alt) &&
	integer(v.index) &&
	v.index >= 0 &&
	v.index < 5 &&
	imageUrl(v.url)
const result: Guard<GameResult> = (v): v is GameResult =>
	isRecord(v) &&
	keys(v, ['title', 'originalTitle', 'posterUrl', 'releaseYear']) &&
	text(v.title) &&
	text(v.originalTitle) &&
	integer(v.releaseYear) &&
	imageUrl(v.posterUrl)
const gameKeys = ['gameId', 'difficulty', 'genre', 'totalFrames', 'version', 'serverTime', 'attemptedMovieIds', 'status']
const base = (v: Record<string, unknown>) =>
	uuid(v.gameId) &&
	isGameDifficulty(v.difficulty) &&
	isGameGenre(v.genre) &&
	v.totalFrames === 5 &&
	integer(v.version) &&
	v.version > 0 &&
	integer(v.serverTime) &&
	ids(v.attemptedMovieIds)
const game: Guard<GameResponse> = (v): v is GameResponse => {
	if (!isRecord(v) || !base(v)) return false
	if (v.status === 'playing') return keys(v, [...gameKeys, 'currentFrame']) && frame(v.currentFrame)
	if (v.status === 'won' || v.status === 'lost') return keys(v, [...gameKeys, 'result']) && result(v.result)
	return (
		(v.status === 'loading' || v.status === 'error') &&
		keys(v, [...gameKeys, 'operationId', 'error']) &&
		uuid(v.operationId) &&
		nullableText(v.error)
	)
}
const settings: Guard<LobbySettings> = (v): v is LobbySettings =>
	isRecord(v) &&
	keys(v, ['name', 'capacity', 'filmCount', 'difficulty', 'genre', 'mode', 'visibility']) &&
	text(v.name) &&
	integer(v.capacity) &&
	v.capacity >= 2 &&
	v.capacity <= 4 &&
	integer(v.filmCount) &&
	v.filmCount >= 1 &&
	v.filmCount <= 50 &&
	isGameDifficulty(v.difficulty) &&
	isGameGenre(v.genre) &&
	v.mode === 'points' &&
	(v.visibility === 'public' || v.visibility === 'private')
const summary: Guard<LobbySummary> = (v): v is LobbySummary =>
	isRecord(v) &&
	text(v.id) &&
	settings(v.settings) &&
	integer(v.playerCount) &&
	v.playerCount >= 0 &&
	v.playerCount <= 4 &&
	typeof v.hasPassword === 'boolean'
const statuses = ['closed', 'error', 'finished', 'loading', 'playing', 'round-result', 'waiting']
const playerIds = (v: unknown): v is string[] => strings(v) && v.every(uuid) && new Set(v).size === v.length
const roundResult: Guard<RoomRoundResult> = (v): v is RoomRoundResult => {
	if (!(
		isRecord(v) &&
		keys(v, [
			'roundId',
			'roundNumber',
			'outcome',
			'readyPlayerIds',
			'requiredPlayerIds',
			'isReady',
			'canContinue',
			'isLastRound'
		]) &&
		uuid(v.roundId) &&
		integer(v.roundNumber) &&
		v.roundNumber >= 1 &&
		v.roundNumber <= 50 &&
		(v.outcome === 'won' || v.outcome === 'lost') &&
		playerIds(v.readyPlayerIds) &&
		playerIds(v.requiredPlayerIds) &&
		typeof v.isReady === 'boolean' &&
		typeof v.canContinue === 'boolean' &&
		typeof v.isLastRound === 'boolean'
	))
		return false
	const requiredPlayerIds = v.requiredPlayerIds
	return v.readyPlayerIds.every((id) => requiredPlayerIds.includes(id))
}
const player: Guard<RoomPlayer> = (v): v is RoomPlayer =>
	isRecord(v) &&
	keys(v, ['id', 'nickname', 'score', 'status', 'lastAnswer', 'connected', 'left']) &&
	uuid(v.id) &&
	text(v.nickname) &&
	integer(v.score) &&
	['playing', 'won', 'lost'].includes(String(v.status)) &&
	(v.lastAnswer === null || v.lastAnswer === 'correct' || v.lastAnswer === 'incorrect') &&
	typeof v.connected === 'boolean' &&
	typeof v.left === 'boolean'
const member: Guard<RoomSnapshot> = (v): v is RoomSnapshot =>
	isRecord(v) &&
	keys(v, [
		'view',
		'id',
		'settings',
		'hostId',
		'players',
		'status',
		'roundId',
		'roundNumber',
		'deadline',
		'currentFrame',
		'attemptedMovieIds',
		'winnerIds',
		'error',
		'result',
		'roundResult',
		'version',
		'serverTime'
	]) &&
	v.view === 'member' &&
	text(v.id) &&
	settings(v.settings) &&
	uuid(v.hostId) &&
	Array.isArray(v.players) &&
	v.players.length <= 4 &&
	v.players.every(player) &&
	statuses.includes(String(v.status)) &&
	uuid(v.roundId) &&
	integer(v.roundNumber) &&
	v.roundNumber >= 0 &&
	v.roundNumber <= 50 &&
	(v.deadline === null || integer(v.deadline)) &&
	(v.currentFrame === null || (v.status === 'playing' && frame(v.currentFrame))) &&
	ids(v.attemptedMovieIds) &&
	strings(v.winnerIds) &&
	nullableText(v.error) &&
	(v.status === 'round-result'
		? result(v.result) &&
			roundResult(v.roundResult) &&
			v.currentFrame === null &&
			v.deadline === null &&
			v.roundResult.roundId === v.roundId &&
			v.roundResult.roundNumber === v.roundNumber &&
			v.roundResult.isLastRound === (v.roundNumber === v.settings.filmCount)
		: v.roundResult === null && (v.result === null || (v.status === 'finished' && result(v.result)))) &&
	integer(v.version) &&
	v.version > 0 &&
	integer(v.serverTime)

export function parse<T>(value: unknown, guard: Guard<T>): T {
	if (!guard(value)) throw new ApiError(502, { code: 'INVALID_RESPONSE', message: 'Некорректный ответ сервера.' })
	return value
}
export const parseGame = (v: unknown): GameResponse => parse(v, game)
export const parsePendingGame = (v: unknown): PendingGame =>
	parse(
		v,
		(x): x is PendingGame =>
			isRecord(x) &&
			keys(x, ['gameId', 'operationId', 'status', 'version', 'serverTime']) &&
			uuid(x.gameId) &&
			uuid(x.operationId) &&
			x.status === 'loading' &&
			integer(x.version) &&
			x.version > 0 &&
			integer(x.serverTime)
	)
export const parseGuess = (v: unknown): SubmitGuessResponse =>
	parse(v, (x): x is SubmitGuessResponse => {
		if (!isRecord(x)) return false
		const { correct, ...snapshot } = x
		return (
			typeof correct === 'boolean' &&
			game(snapshot) &&
			(snapshot.status === 'won' ? correct : (snapshot.status === 'lost' || snapshot.status === 'playing') && !correct)
		)
	})
export const parseRoom = (v: unknown): RoomSnapshot => parse(v, member)
export const parseRoomView = (v: unknown): RoomView =>
	parse(
		v,
		(x): x is RoomView =>
			member(x) ||
			(isRecord(x) &&
				keys(x, ['view', 'id', 'settings', 'playerCount', 'hasPassword', 'status']) &&
				x.view === 'preview' &&
				summary(x) &&
				statuses.includes(String(x.status)))
	)
export const parseLobbies = (v: unknown): LobbySummary[] =>
	parse(
		v,
		(x): x is LobbySummary[] =>
			Array.isArray(x) && x.every((item) => summary(item) && keys(item, ['id', 'settings', 'playerCount', 'hasPassword']))
	)
export const parseSuggestions = (v: unknown): MovieSuggestion[] =>
	parse(
		v,
		(x): x is MovieSuggestion[] =>
			Array.isArray(x) &&
			x.length <= 10 &&
			x.every(
				(item) =>
					isRecord(item) &&
					keys(item, ['id', 'title', 'englishTitle', 'releaseYear']) &&
					movieId(item.id) &&
					text(item.title) &&
					text(item.englishTitle) &&
					integer(item.releaseYear)
			)
	)
export const parseCollections = (v: unknown): MovieCollectionSummary[] =>
	parse(
		v,
		(x): x is MovieCollectionSummary[] =>
			Array.isArray(x) &&
			x.every(
				(item) =>
					isRecord(item) &&
					keys(item, ['id', 'title', 'description', 'movieCount']) &&
					item.id === 'tmdb-catalog' &&
					text(item.title) &&
					text(item.description) &&
					integer(item.movieCount) &&
					item.movieCount >= 0
			)
	)
