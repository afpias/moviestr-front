import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { installPrimeVue } from '@app/providers/primevue'
import router from '@app/router'
import { enableBrowserMocks } from '@shared/api/mock/enable-browser-mocks'
import { useThemeStore } from '@shared/stores/theme.store'

import App from './App.vue'

import 'primeicons/primeicons.css'
import '@assets/main.css'

async function bootstrap(): Promise<void> {
	await enableBrowserMocks()

	const app = createApp(App)
	const pinia = createPinia()

	app.use(pinia)
	app.use(router)
	installPrimeVue(app)
	useThemeStore(pinia).initializeTheme()

	app.mount('#app')
}

void bootstrap()
