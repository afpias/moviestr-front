import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import RoundResult from '../RoundResult.vue'

const result = {
	originalTitle: 'The Matrix',
	posterUrl: 'https://image.test/poster.jpg',
	releaseYear: 1999,
	title: 'Матрица'
}

describe('round result', () => {
	it('показывает правильный ответ и продолжение после победы', async () => {
		const wrapper = mount(RoundResult, {
			props: { result, status: 'won' }
		})

		expect(wrapper.text()).toContain('Матрица')
		expect(wrapper.text()).toContain('The Matrix')
		await wrapper.get('button').trigger('click')
		expect(wrapper.emitted('continue')).toHaveLength(1)
	})

	it('предлагает повторить ту же сложность после поражения без вводного текста', () => {
		const wrapper = mount(RoundResult, {
			props: { result, status: 'lost' }
		})

		expect(wrapper.text()).toContain('Не угадано')
		expect(wrapper.text()).toContain('Повторить')
		expect(wrapper.text()).not.toContain('Раунд окончен')
		expect(wrapper.text()).not.toContain('Это был правильный ответ')
	})
})
