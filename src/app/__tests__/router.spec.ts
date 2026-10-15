import { describe, expect, it } from 'vitest'
import { RouterView } from 'vue-router'

import { mount } from '@vue/test-utils'

import router from '../router'

describe('router', () => {
	it('открывает страницу 404 по неизвестному адресу', async () => {
		await router.push('/unknown/page')
		const wrapper = mount(RouterView, { global: { plugins: [router] } })

		try {
			expect(router.currentRoute.value.name).toBe('not-found')
			expect(wrapper.get('h1').text()).toBe('Такой страницы нет')
			expect(wrapper.get('a').attributes('href')).toBe('/')
			expect(document.title).toBe('Страница не найдена · Moviestr')
		} finally {
			wrapper.unmount()
		}
	})
})
