import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'

import { GenreSelector } from '@features/select-genre'
import GamePage from '@pages/game/GamePage.vue'
import { useGameStore } from '@shared/stores/game.store'

const mountedWrappers: VueWrapper[] = []

function mountGamePage() {
	const pinia = createPinia()
	setActivePinia(pinia)
	const wrapper = mount(GamePage, {
		global: {
			plugins: [pinia]
		}
	})
	mountedWrappers.push(wrapper)

	return {
		gameStore: useGameStore(),
		wrapper
	}
}

describe('game page', () => {
	afterEach(() => {
		for (const wrapper of mountedWrappers.splice(0)) {
			wrapper.unmount()
		}
		delete document.documentElement.dataset.gameDifficulty
	})

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

		expect(wrapper.find('.game-page__alert').exists()).toBe(false)
		expect(wrapper.find('figcaption').exists()).toBe(false)
	})

	it('показывает правильный ответ и продолжает после победы', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		await wrapper.get('#movie-answer').trigger('focus')
		await wrapper.get('#movie-answer').setValue('interstellar')
		expect(wrapper.get('.answer-form button').text()).toContain('Пропустить')

		await vi.waitFor(() => {
			expect(document.querySelector('[role="option"]')).not.toBeNull()
		})
		const option = document.querySelector<HTMLElement>('[role="option"]')
		expect(option?.textContent).toContain('Интерстеллар')
		expect(option?.textContent).toContain('Interstellar')
		await new DOMWrapper(option!).trigger('click')

		expect(wrapper.get('.answer-form button').text()).toContain('Угадать')
		await wrapper.get('form').trigger('submit')

		await vi.waitFor(() => {
			expect(gameStore.status).toBe('won')
		})

		expect(wrapper.text()).toContain('Интерстеллар')
		expect(wrapper.find('.movie-frame').exists()).toBe(false)
		const continueButton = wrapper.findAll('button').find((button) => button.text().includes('Далее'))
		await continueButton?.trigger('click')

		await vi.waitFor(() => {
			expect(gameStore.difficulty).toBe('medium')
			expect(gameStore.status).toBe('playing')
		})
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
		expect(document.documentElement.dataset.gameDifficulty).toBe('medium')
	})

	it('выбирает жанр и перезапускает раунд через левую панель', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		wrapper.getComponent(GenreSelector).vm.$emit('update:modelValue', 'horror')
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

	it('меняет пропуск на сдачу на пятом кадре и повторяет сложность после поражения', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		for (let frame = 1; frame < 5; frame += 1) {
			await gameStore.skipFrame()
		}
		await wrapper.vm.$nextTick()

		expect(wrapper.get('.answer-form button').text()).toContain('Сдаться')
		await wrapper.get('form').trigger('submit')

		await vi.waitFor(() => {
			expect(gameStore.status).toBe('lost')
		})
		expect(wrapper.text()).not.toContain('Раунд окончен')
		expect(wrapper.text()).not.toContain('Это был правильный ответ')
		expect(wrapper.text()).toContain('Интерстеллар')
		expect(wrapper.find('.movie-frame').exists()).toBe(false)

		const retryButton = wrapper.findAll('button').find((button) => button.text().includes('Повторить'))
		await retryButton?.trigger('click')

		await vi.waitFor(() => {
			expect(gameStore.status).toBe('playing')
			expect(gameStore.difficulty).toBe('easy')
			expect(gameStore.currentFrame?.index).toBe(0)
		})
	})

	it('сохраняет игровой каркас во время загрузки нового кадра', async () => {
		const { gameStore, wrapper } = mountGamePage()

		await vi.waitFor(() => {
			expect(wrapper.find('#movie-answer').exists()).toBe(true)
		})

		gameStore.status = 'loading'
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.game-console').exists()).toBe(true)
		expect(wrapper.find('.game-loading').exists()).toBe(false)
		expect(wrapper.find('.movie-frame__loading').exists()).toBe(true)
		expect(wrapper.text()).not.toContain('Назови этот фильм')
		expect(wrapper.find('.answer-form__hint').exists()).toBe(false)
		expect(wrapper.get('.game-info').text()).not.toContain('Режим')
	})
})
