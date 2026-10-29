import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '@shared/stores/theme.store'

import { readStorage, writeStorage } from '../browser-storage'
import { clearSavedGame, getSavedGame, saveGame } from '../game-persistence'
import { clearLegacyState } from '../legacy-state'

afterEach(() => {
	vi.restoreAllMocks()
})
describe('optional browser persistence', () => {
	it('survives blocked reads/writes/removal without stopping theme and game bootstrap', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError')
		})
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError')
		})
		expect(() => readStorage('key', (value): value is string => typeof value === 'string')).not.toThrow()
		expect(() => writeStorage('key', 'value')).not.toThrow()
		expect(() => clearLegacyState()).not.toThrow()
		expect(() => saveGame('opaque', 'all')).not.toThrow()
		expect(() => clearSavedGame()).not.toThrow()
		expect(getSavedGame()).toBeNull()
		setActivePinia(createPinia())
		expect(() => useThemeStore().initializeTheme()).not.toThrow()
	})
})
