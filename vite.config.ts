import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

const proxy = {
	'/api/v1': { target: 'http://127.0.0.1:3000', changeOrigin: false },
	'/ws': { target: 'ws://127.0.0.1:3000', ws: true, changeOrigin: false }
}

export default defineConfig({
	plugins: [vue(), vueJsx(), tailwindcss(), vueDevTools()],
	server: { proxy },
	preview: { proxy },
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'@app': fileURLToPath(new URL('./src/app', import.meta.url)),
			'@assets': fileURLToPath(new URL('./src/shared/assets', import.meta.url)),
			'@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
			'@features': fileURLToPath(new URL('./src/features', import.meta.url)),
			'@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
			'@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
			'@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url))
		}
	}
})
