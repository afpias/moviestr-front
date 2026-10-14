import { isGameDifficulty } from '@shared/lib/game-difficulty'
import { isGameGenre } from '@shared/lib/game-genres'
import { isRecord } from '@shared/lib/type-guards'

import type { DemoRoom } from './room-model'

export interface DemoRegistry {
	version: 1
	rooms: DemoRoom[]
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

function isStringList(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string')
}

function isNullableString(value: unknown): boolean {
	return value === null || typeof value === 'string'
}

function isFrame(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.alt === 'string' &&
		Number.isInteger(value.index) &&
		isFiniteNumber(value.index) &&
		value.index >= 0 &&
		value.index < 5 &&
		typeof value.url === 'string' &&
		value.url.startsWith('https://image.tmdb.org/')
	)
}

function isMovie(value: unknown): boolean {
	return (
		value === null ||
		(isRecord(value) &&
			typeof value.id === 'string' &&
			typeof value.title === 'string' &&
			typeof value.originalTitle === 'string' &&
			typeof value.posterUrl === 'string' &&
			isFiniteNumber(value.releaseYear) &&
			Array.isArray(value.frames) &&
			value.frames.length === 5 &&
			value.frames.every(isFrame))
	)
}

function isPlayer(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.nickname === 'string' &&
		isFiniteNumber(value.score) &&
		typeof value.status === 'string' &&
		['playing', 'lost', 'won'].includes(value.status) &&
		isFiniteNumber(value.frameIndex) &&
		Number.isInteger(value.frameIndex) &&
		value.frameIndex >= 0 &&
		value.frameIndex < 5 &&
		isStringList(value.attemptedMovieIds) &&
		(value.lastAnswer === null || value.lastAnswer === 'correct' || value.lastAnswer === 'incorrect') &&
		isFiniteNumber(value.lastSeen) &&
		typeof value.left === 'boolean'
	)
}

function isRoom(value: unknown): value is DemoRoom {
	if (!isRecord(value) || !isRecord(value.settings)) {
		return false
	}
	const settings = value.settings
	return (
		typeof value.id === 'string' &&
		typeof value.hostId === 'string' &&
		typeof settings.name === 'string' &&
		settings.name.trim().length >= 2 &&
		settings.name.length <= 60 &&
		isFiniteNumber(settings.capacity) &&
		Number.isInteger(settings.capacity) &&
		settings.capacity >= 2 &&
		settings.capacity <= 4 &&
		isFiniteNumber(settings.filmCount) &&
		Number.isInteger(settings.filmCount) &&
		settings.filmCount >= 1 &&
		settings.filmCount <= 50 &&
		isGameDifficulty(settings.difficulty) &&
		isGameGenre(settings.genre) &&
		settings.mode === 'points' &&
		typeof settings.visibility === 'string' &&
		['public', 'private'].includes(settings.visibility) &&
		Array.isArray(value.players) &&
		value.players.length <= settings.capacity &&
		value.players.every(isPlayer) &&
		typeof value.status === 'string' &&
		['waiting', 'loading', 'playing', 'finished', 'error', 'closed'].includes(value.status) &&
		isNullableString(value.passwordHash) &&
		typeof value.roundId === 'string' &&
		isFiniteNumber(value.roundNumber) &&
		Number.isInteger(value.roundNumber) &&
		value.roundNumber >= 0 &&
		(value.deadline === null || isFiniteNumber(value.deadline)) &&
		isMovie(value.movie) &&
		(value.status !== 'playing' || value.movie !== null) &&
		isStringList(value.usedMovieIds) &&
		isFiniteNumber(value.loadingSince) &&
		isNullableString(value.loaderId) &&
		isNullableString(value.error) &&
		isFiniteNumber(value.updatedAt)
	)
}

export function parseRegistry(rawValue: string | null): DemoRegistry {
	if (rawValue === null) {
		return { version: 1, rooms: [] }
	}
	try {
		const value: unknown = JSON.parse(rawValue)
		if (isRecord(value) && value.version === 1 && Array.isArray(value.rooms) && value.rooms.every(isRoom)) {
			return { version: 1, rooms: value.rooms }
		}
	} catch {
		// Corrupted demo data never becomes application state.
	}
	return { version: 1, rooms: [] }
}
