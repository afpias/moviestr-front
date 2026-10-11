import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DOMWrapper, mount } from '@vue/test-utils'

import MovieCombobox from '../MovieCombobox.vue'

describe('movie combobox', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('запрашивает подсказки после ввода и выбирает фильм', async () => {
		const suggestion = { englishTitle: 'The Matrix', id: 'tmdb-603', releaseYear: 1999, title: 'Матрица' }
		const wrapper = mount(MovieCombobox, {
			props: {
				inputId: 'movie-answer',
				modelValue: null,
				suggestions: []
			}
		})
		const input = wrapper.get('input')

		await input.trigger('focus')
		await input.setValue('matrix')
		await vi.advanceTimersByTimeAsync(250)

		expect(wrapper.emitted('search')).toEqual([['matrix']])

		await wrapper.setProps({ suggestions: [suggestion] })
		await vi.waitFor(() => expect(document.querySelector('[role="option"]')).not.toBeNull())
		const option = document.querySelector<HTMLElement>('[role="option"]')
		expect(option).not.toBeNull()
		await new DOMWrapper(option!).trigger('click')

		expect(wrapper.emitted('update:modelValue')).toContainEqual([suggestion])
		wrapper.unmount()
	})

	it('показывает русское и английское названия над полем', async () => {
		const wrapper = mount(MovieCombobox, {
			props: {
				inputId: 'movie-answer',
				modelValue: 'matrix',
				suggestions: [{ englishTitle: 'The Matrix', id: 'tmdb-603', releaseYear: 1999, title: 'Матрица' }]
			}
		})

		await wrapper.get('input').trigger('focus')

		await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull())
		const listbox = document.querySelector<HTMLElement>('[role="listbox"]')
		const option = document.querySelector<HTMLElement>('[role="option"]')
		expect(listbox?.dataset.side).toBe('top')
		expect(option?.textContent).toContain('Матрица')
		expect(option?.textContent).toContain('The Matrix')

		wrapper.unmount()
	})
})
