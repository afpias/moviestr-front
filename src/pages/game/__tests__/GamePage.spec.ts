import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'

import GamePage from '@pages/game/GamePage.vue'
import { useGameStore } from '@shared/stores/game.store'

function mountGamePage() {
	const pinia = createPinia()
	setActivePinia(pinia)

	return {
		gameStore: useGameStore(),
		wrapper: mount(GamePage, {
			global: {
				plugins: [pinia]
			}
		})
	}
}

describe('game page', () => {
	it('сразу показывает игру и пропускает кадр без ответа', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		expect(wrapper.get('.answer-form button').text()).toContain('Пропустить')
		await wrapper.get('form').trigger('submit')

		await vi.waitFor(() => {
			expect(gameStore.currentFrame?.index).toBe(1)
		})

		expect(wrapper.text()).toContain('Показываем следующий кадр.')
	})

	it('меняет действие на угадывание только после выбора фильма', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		await wrapper.get('#movie-answer').trigger('focus')
		await wrapper.get('#movie-answer').setValue('Интерстеллар')
		expect(wrapper.get('.answer-form button').text()).toContain('Пропустить')

		await vi.waitFor(() => {
			expect(wrapper.find('[role="option"]').exists()).toBe(true)
		})
		await wrapper.get('[role="option"]').trigger('mousedown')

		expect(wrapper.get('.answer-form button').text()).toContain('Угадать')
		await wrapper.get('form').trigger('submit')

		await vi.waitFor(() => {
			expect(gameStore.difficulty).toBe('medium')
		})

		expect(wrapper.text()).toContain('Верно! Переходим в режим Medium.')
	})

	it('переключает режим без обязательного ответа', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		const mediumButton = wrapper.findAll('[role="radio"]').find((button) => button.text().includes('Medium'))
		expect(mediumButton).toBeDefined()
		await mediumButton?.trigger('click')

		await vi.waitFor(() => {
			expect(gameStore.difficulty).toBe('medium')
		})
	})

	it('выбирает жанр и перезапускает раунд через левую панель', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		await wrapper.get('select[aria-label="Жанр фильма"]').setValue('horror')
		await vi.waitFor(() => {
			expect(gameStore.genre).toBe('horror')
		})

		await gameStore.switchDifficulty('hard')
		await wrapper.get('.game-sidebar__restart').trigger('click')

		await vi.waitFor(() => {
			expect(gameStore.difficulty).toBe('easy')
		})
		expect(gameStore.genre).toBe('horror')
	})
})
