<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

import { Moon, Sun } from '@lucide/vue'

import { useThemeStore } from '@shared/stores/theme.store'
import { Button } from '@shared/ui'

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
				size="icon"
				type="button"
				variant="ghost"
				@click="themeStore.toggleTheme"
			>
				<Sun v-if="themeStore.theme === 'dark'" :size="19" />
				<Moon v-else :size="19" />
			</Button>
		</header>

		<main id="main-content" class="app-main">
			<RouterView />
		</main>

		<footer class="app-footer">
			<div>
				<p>Moviestr · угадывай кино по кадрам</p>
				<p class="app-footer__attribution">Этот продукт использует TMDB API, но не одобрен и не сертифицирован TMDB.</p>
			</div>
			<div class="app-footer__links">
				<a href="https://www.themoviedb.org" rel="noreferrer" target="_blank">TMDB</a>
				<RouterLink to="/rules">Как играть</RouterLink>
			</div>
		</footer>
	</div>
</template>

<style scoped src="./App.css"></style>
