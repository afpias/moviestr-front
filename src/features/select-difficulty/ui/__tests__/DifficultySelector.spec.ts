import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import DifficultySelector from '../DifficultySelector.vue'

describe('difficulty selector', () => {
	it('выбирает новый режим сложности', async () => {
		const wrapper = mount(DifficultySelector, {
			props: { modelValue: 'easy' }
		})

		await wrapper.get('[aria-checked="false"]').trigger('click')

		expect(wrapper.emitted('update:modelValue')).toEqual([['medium']])
	})

	it('не изменяет режим только для чтения', async () => {
		const wrapper = mount(DifficultySelector, {
			props: { modelValue: 'hard', readonly: true }
		})

		await wrapper.get('.difficulty-selector__option--easy').trigger('click')

		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
	})
})
