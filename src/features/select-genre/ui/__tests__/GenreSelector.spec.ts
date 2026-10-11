import { describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'

import GenreSelector from '../GenreSelector.vue'

describe('genre selector', () => {
	it('показывает выбранный жанр и раскрывает варианты с иконками', async () => {
		const wrapper = mount(GenreSelector, {
			attachTo: document.body,
			props: {
				modelValue: 'all'
			}
		})

		expect(wrapper.get('button[aria-label="Жанр фильма"]').text()).toContain('Все жанры')
		wrapper
			.get('button[aria-label="Жанр фильма"]')
			.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }))
		await wrapper.vm.$nextTick()

		await vi.waitFor(() => {
			expect(document.querySelectorAll('[role="option"]')).toHaveLength(8)
		})
		const options = document.querySelectorAll<HTMLElement>('[role="option"]')
		expect(options[1]?.querySelector('svg')).not.toBeNull()
		expect(options[0]?.getAttribute('aria-selected')).toBe('true')

		wrapper.unmount()
	})

	it('выбирает жанр и закрывает меню', async () => {
		const wrapper = mount(GenreSelector, {
			attachTo: document.body,
			props: {
				modelValue: 'all'
			}
		})

		wrapper
			.get('button[aria-label="Жанр фильма"]')
			.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }))
		await wrapper.vm.$nextTick()
		await vi.waitFor(() => expect(document.querySelectorAll('[role="option"]')).toHaveLength(8))
		const actionOption = document.querySelectorAll<HTMLElement>('[role="option"]')[1]
		expect(actionOption).toBeDefined()
		actionOption!.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0 }))
		await wrapper.vm.$nextTick()

		expect(wrapper.emitted('update:modelValue')).toContainEqual(['action'])
		await vi.waitFor(() => {
			expect(document.querySelector('[role="listbox"][data-state="open"]')).toBeNull()
		})

		wrapper.unmount()
	})
})
