import { describe, expect, it, vi } from 'vitest'

import type { LobbySettings } from '@shared/types/multiplayer'

import { createDemoAdapter } from '../demo-adapter'
import type { RoomMovie } from '../room-model'

const settings: LobbySettings = {
	name: 'Лобби',
	capacity: 2,
	filmCount: 2,
	difficulty: 'easy',
	genre: 'all',
	mode: 'points',
	visibility: 'public'
}

function setup() {
	const data = new Map<string, string>()
	let time = 0
	let sequence = 0
	let queue = Promise.resolve()
	const listeners = new Set<() => void>()
	const loadMovie = vi.fn(async (): Promise<RoomMovie> => ({
		id: `tmdb-${++sequence}`,
		title: 'Фильм',
		originalTitle: 'Movie',
		releaseYear: 2000,
		posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
		frames: Array.from({ length: 5 }, (_, index) => ({ index, alt: 'Кадр', url: `https://image.tmdb.org/t/p/w780/${index}.jpg` }))
	}))
	function exclusive<T>(operation: () => T): Promise<T> {
		const result = queue.then(operation)
		queue = result.then(
			() => undefined,
			() => undefined
		)
		return result
	}
	const options = {
		storage: {
			getItem: (key: string) => data.get(key) ?? null,
			setItem: (key: string, value: string) => {
				data.set(key, value)
			}
		},
		exclusive,
		loadMovie,
		hashPassword: async (roomId: string, password: string) => `${roomId}:hash:${password}`,
		now: () => time,
		newId: () => 'room-id-000001',
		onChange: (callback: () => void) => {
			listeners.add(callback)
			return () => {
				listeners.delete(callback)
			}
		},
		notify: () => {
			for (const callback of listeners) {
				callback()
			}
		}
	}
	const alice = createDemoAdapter({ ...options, participantId: 'alice' })
	const bob = createDemoAdapter({ ...options, participantId: 'bob' })
	const eve = createDemoAdapter({ ...options, participantId: 'eve' })
	return {
		alice,
		bob,
		eve,
		loadMovie,
		data,
		setTime: (value: number) => {
			time = value
		}
	}
}

describe('demo multiplayer adapter', () => {
	it('проверяет пароль и скрывает закрытые комнаты из публичного списка', async () => {
		const { alice, bob } = setup()
		const id = await alice.createRoom({ ...settings, visibility: 'private' }, 'Алиса', 'secret')
		expect(alice.listRooms()).toEqual([])
		await expect(bob.joinRoom(id, 'Боб', 'wrong')).rejects.toThrow('пароль')
		await bob.joinRoom(id, 'Боб', 'secret')
		expect(bob.getRoom(id)?.players).toHaveLength(2)
		expect(JSON.stringify(bob.getRoom(id))).not.toContain('secret')
	})

	it('атомарно допускает только одного из двух претендентов на последнее место', async () => {
		const { alice, bob, eve } = setup()
		const id = await alice.createRoom(settings, 'Алиса', '')
		const results = await Promise.allSettled([bob.joinRoom(id, 'Боб', ''), eve.joinRoom(id, 'Ева', '')])
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
		expect(alice.getRoom(id)?.players).toHaveLength(2)
	})

	it('один раз загружает фильм для двух участников и завершает матч с общей таблицей', async () => {
		const { alice, bob, loadMovie } = setup()
		const id = await alice.createRoom(settings, 'Алиса', '')
		await bob.joinRoom(id, 'Боб', '')
		await alice.startRoom(id)
		await Promise.all([alice.prepareMovie(id), bob.prepareMovie(id)])
		expect(loadMovie).toHaveBeenCalledTimes(1)
		const roundId = alice.getRoom(id)?.roundId ?? ''
		expect(alice.getRoom(id)?.currentFrame).toEqual(bob.getRoom(id)?.currentFrame)
		await alice.submitGuess(id, roundId, 'tmdb-1')
		expect(bob.getRoom(id)?.status).toBe('playing')
		await bob.submitGuess(id, roundId, 'tmdb-1')
		expect(alice.getRoom(id)?.status).toBe('loading')
		await bob.prepareMovie(id)
		const nextRoundId = bob.getRoom(id)?.roundId ?? ''
		await Promise.all([alice.submitGuess(id, nextRoundId, 'tmdb-2'), bob.submitGuess(id, nextRoundId, 'tmdb-2')])
		expect(alice.getRoom(id)?.status).toBe('finished')
		expect(alice.getRoom(id)?.winnerIds).toEqual(['alice', 'bob'])
		expect(alice.getRoom(id)?.players.map((player) => player.score)).toEqual([1200, 1200])
	})

	it('восстанавливает участника без потери личного кадра и игнорирует запоздавший ответ', async () => {
		const { alice, bob, setTime } = setup()
		const id = await alice.createRoom(settings, 'Алиса', '')
		await bob.joinRoom(id, 'Боб', '')
		await alice.startRoom(id)
		await alice.prepareMovie(id)
		const roundId = alice.getRoom(id)?.roundId ?? ''
		await bob.submitGuess(id, roundId, 'tmdb-99')
		setTime(20_000)
		await bob.joinRoom(id, 'ignored', '')
		expect(bob.getRoom(id)?.currentFrame?.index).toBe(1)
		expect(bob.getRoom(id)?.attemptedMovieIds).toEqual(['tmdb-99'])
		setTime(90_001)
		await alice.heartbeat(id)
		await bob.submitGuess(id, roundId, 'tmdb-1')
		expect(bob.getRoom(id)?.players.find((player) => player.id === 'bob')?.score).toBe(900)
	})

	it('сообщает ошибку подготовки без списания очков и позволяет хосту повторить её', async () => {
		const { alice, bob, loadMovie } = setup()
		const id = await alice.createRoom(settings, 'Алиса', '')
		await bob.joinRoom(id, 'Боб', '')
		await alice.startRoom(id)
		loadMovie.mockRejectedValueOnce(new Error('TMDB недоступен'))
		await alice.prepareMovie(id)
		expect(alice.getRoom(id)?.status).toBe('error')
		expect(alice.getRoom(id)?.players[0]?.score).toBe(1000)
		await expect(bob.retryPreparation(id)).rejects.toThrow('хосту')
		await alice.retryPreparation(id)
		await alice.prepareMovie(id)
		expect(alice.getRoom(id)?.status).toBe('playing')
	})
})
