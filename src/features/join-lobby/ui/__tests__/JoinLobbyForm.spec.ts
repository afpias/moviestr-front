import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import JoinLobbyForm from '../JoinLobbyForm.vue'

describe('join lobby form', () => {
	it('передаёт код, гостевой никнейм и пароль', async () => {
		const wrapper = mount(JoinLobbyForm, { props: { busy: false } })
		await wrapper.get('#join-code').setValue('room-code')
		await wrapper.get('#guest-nickname').setValue('Боб')
		await wrapper.get('#join-password').setValue('test-only')
		await wrapper.get('form').trigger('submit')
		expect(wrapper.emitted('join')?.[0]).toEqual(['room-code', 'Боб', 'test-only'])
		wrapper.unmount()
	})

	it('по ссылке использует код комнаты без повторного ввода', async () => {
		const wrapper = mount(JoinLobbyForm, { props: { busy: false, roomId: 'from-link' } })
		expect(wrapper.find('#join-code').exists()).toBe(false)
		await wrapper.get('#guest-nickname').setValue('Боб')
		await wrapper.get('form').trigger('submit')
		expect(wrapper.emitted('join')?.[0]).toEqual(['from-link', 'Боб', ''])
		wrapper.unmount()
	})
})
