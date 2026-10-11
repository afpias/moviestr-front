import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { flushPromises, mount } from '@vue/test-utils'

import GamePage from '@pages/game/GamePage.vue'
import { useGameStore } from '@shared/stores/game.store'

describe('game page', () => {
	it('показывает следующий кадр после неверного ответа', async () => {
		const pinia = createPinia()
		setActivePinia(pinia)
		const gameStore = useGameStore()
		const gameId = await gameStore.startGame('top-250', 'easy')
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{
					component: GamePage,
					meta: { title: 'Игра' },
					path: '/game/:id'
				}
			]
		})

		await router.push(`/game/${gameId}`)
		await router.isReady()

		const wrapper = mount(GamePage, {
			global: {
				plugins: [pinia, router],
				stubs: {
					Button: true,
					Dialog: true,
					Skeleton: true
				}
			}
		})

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})
		await wrapper.get('#movie-answer').setValue('не тот фильм')
		await wrapper.get('form').trigger('submit')
		await vi.waitFor(() => {
			expect(gameStore.currentFrame?.index).toBe(1)
		})
		await flushPromises()

		expect(wrapper.text()).toContain('Не угадал — открываем следующий кадр.')
		expect(wrapper.get('img').attributes('alt')).toContain('кадр 2')
	})
})
