import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mount, type VueWrapper } from '@vue/test-utils'

import { startRoom } from '@features/manage-room'
import { skipRoomFrame, submitRoomGuess } from '@features/play-multiplayer'
import { MovieCombobox } from '@features/search-movie'
import { useMultiplayerStore } from '@shared/stores/multiplayer.store'
import type { RoomSnapshot } from '@shared/types/multiplayer'

import RoomConsole from '../RoomConsole.vue'

vi.mock('@features/manage-room', () => ({ startRoom: vi.fn(), retryRoom: vi.fn() }))
vi.mock('@features/play-multiplayer', () => ({ submitRoomGuess: vi.fn(), skipRoomFrame: vi.fn(), readyRoomRound: vi.fn() }))

const wrappers: VueWrapper[] = []

function mountConsole(status: RoomSnapshot['status'] = 'playing') {
	const pinia = createPinia()
	setActivePinia(pinia)
	const store = useMultiplayerStore()
	store.participantId = 'alice'
	store.connection = 'connected'
	store.room = {
		view: 'member',
		version: 1,
		serverTime: Date.now(),
		id: 'room',
		settings: {
			name: 'Кино',
			capacity: 4,
			filmCount: 20,
			difficulty: 'easy',
			genre: 'all',
			mode: 'points',
			visibility: 'public'
		},
		hostId: 'alice',
		status,
		roundId: 'room:1',
		roundNumber: 1,
		deadline: Date.now() + 90_000,
		players: [
			{ id: 'alice', nickname: 'Алиса', score: 1000, status: 'playing', lastAnswer: null, connected: true, left: false },
			{ id: 'bob', nickname: 'Боб', score: 1000, status: 'playing', lastAnswer: null, connected: true, left: false }
		],
		currentFrame: { index: 0, alt: 'Первый кадр', url: 'https://image.tmdb.org/t/p/w780/frame.jpg' },
		attemptedMovieIds: [],
		winnerIds: [],
		error: null,
		result: null,
		roundResult: null
	}
	const wrapper = mount(RoomConsole, { global: { plugins: [pinia] } })
	wrappers.push(wrapper)
	return { store, wrapper }
}

afterEach(() => {
	for (const wrapper of wrappers.splice(0)) {
		wrapper.unmount()
	}
	vi.clearAllMocks()
})

describe('room console', () => {
	it('позволяет хосту начать от двух игроков при четырёх местах', async () => {
		const { wrapper } = mountConsole('waiting')
		const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Начать игру')
		expect(button?.attributes('disabled')).toBeUndefined()
		await button?.trigger('click')
		expect(startRoom).toHaveBeenCalledWith('room')
	})

	it('убирает управление стартом у гостя', async () => {
		const { wrapper, store } = mountConsole('waiting')
		store.participantId = 'bob'
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('button').some((button) => button.text() === 'Начать игру')).toBe(false)
		expect(wrapper.text()).toContain('Хост начнёт')
	})

	it('пропускает личный кадр с номером раунда и индексом для защиты от повтора', async () => {
		const { wrapper } = mountConsole()
		expect(wrapper.find('#room-answer').exists()).toBe(true)
		await wrapper.get('form').trigger('submit')
		expect(skipRoomFrame).toHaveBeenCalledWith('room', 'room:1', 0)
	})

	it('меняет действие на сдачу на пятом кадре', async () => {
		const { wrapper, store } = mountConsole()
		if (store.room) {
			store.room = {
				...store.room,
				currentFrame: { index: 4, alt: 'Пятый кадр', url: 'https://image.tmdb.org/t/p/w780/last.jpg' }
			}
		}
		await wrapper.vm.$nextTick()
		expect(wrapper.get('button[type="submit"]').text()).toContain('Сдаться')
	})

	it('отправляет выбранный TMDB ID независимо от языка названия', async () => {
		const { wrapper } = mountConsole()
		wrapper.getComponent(MovieCombobox).vm.$emit('update:modelValue', {
			id: 'tmdb-603',
			title: 'Матрица',
			englishTitle: 'The Matrix',
			releaseYear: 1999
		})
		await wrapper.vm.$nextTick()
		expect(wrapper.get('button[type="submit"]').text()).toContain('Угадать')
		await wrapper.get('form').trigger('submit')
		expect(submitRoomGuess).toHaveBeenCalledWith('room', 'room:1', 'tmdb-603')
	})

	it('сохраняет введённый запрос при синхронизации неизменившегося раунда', async () => {
		const { wrapper, store } = mountConsole()
		await wrapper.get('#room-answer').setValue('matrix')
		if (store.room) {
			store.room = { ...store.room, players: store.room.players.map((player) => ({ ...player })) }
		}
		await wrapper.vm.$nextTick()
		expect(wrapper.get<HTMLInputElement>('#room-answer').element.value).toBe('matrix')
	})

	it('после победы ждёт других без раскрытия правильного названия', async () => {
		const { wrapper, store } = mountConsole()
		if (store.room) {
			store.room = {
				...store.room,
				players: store.room.players.map((player) =>
					player.id === 'alice' ? { ...player, status: 'won', score: 1100, lastAnswer: 'correct' } : player
				)
			}
		}
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Ждём остальных')
		expect(wrapper.find('#room-answer').exists()).toBe(false)
		expect(wrapper.text()).toContain('1100')
	})

	it('показывает ничью и итоговую таблицу после последнего фильма', async () => {
		const { wrapper, store } = mountConsole('finished')
		if (store.room) {
			store.room = { ...store.room, winnerIds: ['alice', 'bob'] }
		}
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Ничья')
		expect(wrapper.text()).toContain('Алиса, Боб')
		expect(wrapper.find('#room-answer').exists()).toBe(false)
	})
})
