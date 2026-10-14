import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import CreateLobbyForm from '../CreateLobbyForm.vue'

describe('create lobby form', () => {
	it('отправляет настройки, никнейм и необязательный пароль без регистрации', async () => {
		const wrapper = mount(CreateLobbyForm, { props: { busy: false } })
		await wrapper.get('#host-nickname').setValue('Алиса')
		await wrapper.get('#lobby-name').setValue('Компания')
		await wrapper.get('#film-count').setValue(2)
		await wrapper.get('#lobby-password').setValue('test-only')
		await wrapper.get('form').trigger('submit')
		const event = wrapper.emitted('create')?.[0]
		expect(event?.[0]).toMatchObject({
			name: 'Компания',
			capacity: 4,
			filmCount: 2,
			difficulty: 'easy',
			genre: 'all',
			mode: 'points'
		})
		expect(event?.slice(1)).toEqual(['Алиса', 'test-only'])
		wrapper.unmount()
	})

	it('блокирует кнопку во время создания', () => {
		const wrapper = mount(CreateLobbyForm, { props: { busy: true } })
		expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
		wrapper.unmount()
	})
})
