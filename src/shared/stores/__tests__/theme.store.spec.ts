import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '@shared/stores/theme.store'

describe('theme store', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		window.localStorage.clear()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		document.documentElement.classList.remove('app-dark')
	})

	it('использует сохранённую тему при инициализации', () => {
		window.localStorage.setItem('moviestr:theme:v1', JSON.stringify('dark'))
		const themeStore = useThemeStore()

		themeStore.initializeTheme()

		expect(themeStore.theme).toBe('dark')
		expect(document.documentElement.classList.contains('app-dark')).toBe(true)
	})

	it('использует тёмную тему по умолчанию и сохраняет переключение', () => {
		const themeStore = useThemeStore()
		themeStore.initializeTheme()

		expect(themeStore.theme).toBe('dark')

		themeStore.toggleTheme()

		expect(themeStore.theme).toBe('light')
		expect(window.localStorage.getItem('moviestr:theme:v1')).toBe(JSON.stringify('light'))
	})
})
