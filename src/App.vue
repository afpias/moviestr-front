<script setup lang="ts">
import Button from 'primevue/button'
import { RouterLink, RouterView } from 'vue-router'

import { useThemeStore } from '@shared/stores/theme.store'

const themeStore = useThemeStore()
</script>

<template>
	<a class="skip-link" href="#main-content">Перейти к содержимому</a>

	<div class="app-shell">
		<header class="app-header">
			<RouterLink aria-label="Moviestr — на главную" class="brand" to="/">
				<span class="brand__mark" aria-hidden="true">M</span>
				<span>Movie<span>str</span></span>
			</RouterLink>

			<nav aria-label="Основная навигация" class="app-nav">
				<RouterLink to="/">Игра</RouterLink>
				<RouterLink to="/rules">Правила</RouterLink>
				<RouterLink to="/statistics">Статистика</RouterLink>
			</nav>

			<Button
				:aria-label="themeStore.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'"
				:icon="themeStore.theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"
				rounded
				severity="secondary"
				text
				@click="themeStore.toggleTheme"
			/>
		</header>

		<main id="main-content" class="app-main">
			<RouterView />
		</main>

		<footer class="app-footer">
			<p>Moviestr · угадывай кино по кадрам</p>
			<RouterLink to="/rules">Как играть</RouterLink>
		</footer>
	</div>
</template>

<style scoped src="./App.css"></style>
