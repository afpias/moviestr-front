import { describe, expect, it } from 'vitest'

import type { LobbySettings } from '@shared/types/multiplayer'

import {
	applyGuess,
	applySkip,
	createPlayer,
	joinPlayer,
	leavePlayer,
	publishMovie,
	startMatch,
	tickRoom,
	toRoomSnapshot,
	validateSettings,
	type DemoRoom,
	type RoomMovie
} from '../room-model'
import { parseRegistry } from '../storage-schema'

const settings: LobbySettings = {
	name: 'Кино',
	capacity: 4,
	filmCount: 2,
	difficulty: 'easy',
	genre: 'all',
	mode: 'points',
	visibility: 'public'
}

function createRoom(): DemoRoom {
	return {
		id: 'room',
		settings: { ...settings },
		passwordHash: null,
		hostId: 'alice',
		players: [createPlayer('alice', 'Алиса', 0), createPlayer('bob', 'Боб', 0)],
		status: 'waiting',
		roundId: '',
		roundNumber: 0,
		deadline: null,
		movie: null,
		usedMovieIds: [],
		loadingSince: 0,
		loaderId: null,
		error: null,
		updatedAt: 0
	}
}

function movie(id = 'tmdb-1'): RoomMovie {
	return {
		id,
		title: 'Фильм',
		originalTitle: 'Movie',
		posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
		releaseYear: 2000,
		frames: Array.from({ length: 5 }, (_, index) => ({ index, alt: 'Кадр', url: `https://image.tmdb.org/t/p/w780/${index}.jpg` }))
	}
}

function playingRoom(): DemoRoom {
	const room = createRoom()
	startMatch(room, 'alice', 0)
	publishMovie(room, movie(), 0)
	return room
}

describe('multiplayer room rules', () => {
	it('запускает только хост от двух подключённых игроков, не требуя заполнения комнаты', () => {
		const room = createRoom()
		expect(() => startMatch(room, 'bob', 0)).toThrow('хосту')
		startMatch(room, 'alice', 0)
		expect(room.status).toBe('loading')
		expect(room.players.map((player) => player.score)).toEqual([1000, 1000])
		expect(() => startMatch(room, 'alice', 0)).toThrow('уже')
	})

	it('не запускает одинокого хоста и отклоняет неправильные настройки', () => {
		const room = createRoom()
		room.players.pop()
		expect(() => startMatch(room, 'alice', 0)).toThrow('два')
		expect(() => validateSettings({ ...settings, capacity: 5 })).toThrow()
		expect(() => validateSettings({ ...settings, filmCount: 0 })).toThrow()
		expect(() => createPlayer('x', ' ', 0)).toThrow()
	})

	it('не допускает лишнего игрока, одинаковые имена и вход после старта', () => {
		const room = createRoom()
		expect(() => joinPlayer(room, 'x', 'алиса', 0)).toThrow('занят')
		room.settings.capacity = 2
		expect(() => joinPlayer(room, 'x', 'Новый', 0)).toThrow('мест')
		startMatch(room, 'alice', 0)
		expect(() => joinPlayer(room, 'x', 'Новый', 0)).toThrow('началась')
	})

	it('считает неверные ответы и кадры лично, награждает один раз и скрывает ответ от ожидающего', () => {
		const room = playingRoom()
		applyGuess(room, 'alice', room.roundId, 'tmdb-9')
		applyGuess(room, 'alice', room.roundId, 'tmdb-9')
		expect(toRoomSnapshot(room, 'alice', 0).currentFrame?.index).toBe(1)
		expect(toRoomSnapshot(room, 'bob', 0).currentFrame?.index).toBe(0)
		applyGuess(room, 'alice', room.roundId, 'tmdb-1')
		applyGuess(room, 'alice', room.roundId, 'tmdb-1')
		expect(room.players[0]?.score).toBe(1050)
		expect(room.status).toBe('playing')
		expect(toRoomSnapshot(room, 'alice', 0).result).toBeNull()
		expect(JSON.stringify(toRoomSnapshot(room, 'bob', 0))).not.toContain('"Movie"')
	})

	it('пропускает бесплатно и снимает единственный штраф за сдачу на пятом кадре', () => {
		const room = playingRoom()
		for (let index = 0; index < 4; index += 1) {
			applySkip(room, 'alice', room.roundId, index)
		}
		expect(room.players[0]?.score).toBe(1000)
		applySkip(room, 'alice', room.roundId, 4)
		applySkip(room, 'alice', room.roundId, 4)
		expect(room.players[0]?.score).toBe(950)
		expect(room.players[0]?.status).toBe('lost')
	})

	it('игнорирует повтор пропуска с устаревшим индексом кадра', () => {
		const room = playingRoom()
		applySkip(room, 'alice', room.roundId, 0)
		applySkip(room, 'alice', room.roundId, 0)
		expect(room.players[0]?.frameIndex).toBe(1)
	})

	it('не снимает дополнительный штраф за неверный ответ на последнем кадре', () => {
		const room = playingRoom()
		for (let index = 0; index < 5; index += 1) {
			applyGuess(room, 'alice', room.roundId, `tmdb-${index + 10}`)
		}
		expect(room.players[0]?.score).toBe(750)
		expect(room.players[0]?.status).toBe('lost')
	})

	it('сразу готовит общий следующий фильм, не принимая старый ответ', () => {
		const room = playingRoom()
		const oldRoundId = room.roundId
		applyGuess(room, 'alice', oldRoundId, 'tmdb-1')
		applyGuess(room, 'bob', oldRoundId, 'tmdb-1')
		expect(room.status).toBe('loading')
		expect(room.roundNumber).toBe(2)
		publishMovie(room, movie('tmdb-2'), 1000)
		applyGuess(room, 'alice', oldRoundId, 'tmdb-2')
		expect(room.players[0]?.score).toBe(1100)
		expect(room.players[0]?.status).toBe('playing')
		expect(() => publishMovie(room, movie('tmdb-1'), 1000)).toThrow('новый фильм')
	})

	it('применяет deadline один раз и не штрафует уже угадавшего', () => {
		const room = playingRoom()
		applyGuess(room, 'alice', room.roundId, 'tmdb-1')
		const alice = room.players[0]
		if (alice) {
			alice.lastSeen = 90_000
		}
		tickRoom(room, 90_000)
		tickRoom(room, 90_001)
		expect(room.players.map((player) => player.score)).toEqual([1100, 950])
		expect(room.roundNumber).toBe(2)
	})

	it('выявляет нескольких победителей при равенстве очков и допускает отрицательный счёт', () => {
		const room = playingRoom()
		room.settings.filmCount = 1
		for (const player of room.players) {
			player.score = -100
		}
		applyGuess(room, 'alice', room.roundId, 'tmdb-1')
		applyGuess(room, 'bob', room.roundId, 'tmdb-1')
		expect(room.status).toBe('finished')
		expect(toRoomSnapshot(room, 'alice', 0).winnerIds).toEqual(['alice', 'bob'])
	})

	it('передаёт хоста после 30 секунд, сохраняет счёт вышедшего игрока и закрывает пустую комнату', () => {
		const room = playingRoom()
		const bob = room.players[1]
		if (bob) {
			bob.lastSeen = 31_000
		}
		tickRoom(room, 31_000)
		expect(room.hostId).toBe('bob')
		leavePlayer(room, 'alice', 31_000)
		expect(room.players[0]?.score).toBe(950)
		expect(room.players[0]?.left).toBe(true)
		leavePlayer(room, 'bob', 31_000)
		expect(room.status).toBe('closed')
	})

	it('восстанавливает только валидные сохранённые данные', () => {
		const room = playingRoom()
		expect(parseRegistry(JSON.stringify({ version: 1, rooms: [room] })).rooms).toHaveLength(1)
		expect(parseRegistry('{broken').rooms).toEqual([])
		expect(parseRegistry(JSON.stringify({ version: 2, rooms: [room] })).rooms).toEqual([])
		expect(parseRegistry(JSON.stringify({ version: 1, rooms: [{ ...room, status: ['playing'] }] })).rooms).toEqual([])
	})
})
