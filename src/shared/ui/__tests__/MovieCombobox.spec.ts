import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'

import MovieCombobox from '../MovieCombobox.vue'

describe('movie combobox', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('запрашивает подсказки после ввода и выбирает фильм', async () => {
		const suggestion = { id: 'tmdb-603', releaseYear: 1999, title: 'Матрица' }
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
		await wrapper.get('[role="option"]').trigger('mousedown')

		expect(wrapper.emitted('update:modelValue')).toContainEqual([suggestion])
	})
})
