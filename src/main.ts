import { createPinia } from 'pinia'
import { createApp } from 'vue'

import router from '@app/router'
import { useThemeStore } from '@shared/stores/theme.store'

import App from './App.vue'

import '@assets/main.css'

function bootstrap(): void {
	const app = createApp(App)
	const pinia = createPinia()

	app.use(pinia)
	app.use(router)
	useThemeStore(pinia).initializeTheme()

	app.mount('#app')
}

bootstrap()
