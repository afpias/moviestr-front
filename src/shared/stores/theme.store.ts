import { defineStore } from 'pinia'
import { ref } from 'vue'

import { readStorage, writeStorage } from '@shared/lib/browser-storage'

const THEME_STORAGE_KEY = 'moviestr:theme:v1'

export type AppTheme = 'dark' | 'light'

function isTheme(value: unknown): value is AppTheme {
	return value === 'dark' || value === 'light'
}

export const useThemeStore = defineStore('theme', () => {
	const theme = ref<AppTheme>('dark')

	function applyTheme(): void {
		document.documentElement.classList.toggle('app-dark', theme.value === 'dark')
		document.documentElement.style.colorScheme = theme.value
	}

	function initializeTheme(): void {
		const savedTheme = readStorage(THEME_STORAGE_KEY, isTheme)
		const preferredTheme: AppTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

		theme.value = savedTheme ?? preferredTheme
		applyTheme()
	}

	function toggleTheme(): void {
		theme.value = theme.value === 'dark' ? 'light' : 'dark'
		writeStorage(THEME_STORAGE_KEY, theme.value)
		applyTheme()
	}

	return {
		initializeTheme,
		theme,
		toggleTheme
	}
})
