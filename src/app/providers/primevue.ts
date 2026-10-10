import PrimeVue from 'primevue/config'
import type { App } from 'vue'

import Aura from '@primeuix/themes/aura'

export function installPrimeVue(app: App): void {
	app.use(PrimeVue, {
		theme: {
			options: {
				darkModeSelector: '.app-dark'
			},
			preset: Aura
		}
	})
}
