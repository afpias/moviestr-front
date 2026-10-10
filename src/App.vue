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

<style scoped>
.app-shell {
	min-height: 100vh;
	display: grid;
	grid-template-rows: auto 1fr auto;
}

.app-header,
.app-footer {
	width: min(100% - 2rem, 1180px);
	margin-inline: auto;
}

.app-header {
	min-height: 76px;
	display: flex;
	align-items: center;
	gap: 1rem;
	border-bottom: 1px solid var(--app-color-border);
}

.brand {
	display: inline-flex;
	align-items: center;
	gap: 0.65rem;
	color: var(--app-color-text);
	font-size: 1.1rem;
	font-weight: 800;
	letter-spacing: -0.04em;
}

.brand span span {
	color: var(--app-color-accent);
}

.brand__mark {
	width: 2rem;
	aspect-ratio: 1;
	display: grid;
	place-items: center;
	border-radius: 0.65rem;
	background: var(--app-color-accent);
	color: var(--app-color-on-accent);
	font-weight: 900;
	box-shadow: 0 8px 24px var(--app-color-accent-shadow);
}

.app-nav {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	margin-left: auto;
}

.app-nav a {
	padding: 0.6rem 0.75rem;
	border-radius: 0.65rem;
	color: var(--app-color-text-muted);
	font-size: 0.9rem;
	font-weight: 650;
}

.app-nav a:hover,
.app-nav a.router-link-exact-active {
	background: var(--app-color-surface-raised);
	color: var(--app-color-text);
}

.app-main {
	width: min(100% - 2rem, 1180px);
	margin-inline: auto;
	padding-block: clamp(2rem, 6vw, 5rem);
}

.app-footer {
	display: flex;
	justify-content: space-between;
	gap: 1rem;
	padding-block: 1.5rem;
	border-top: 1px solid var(--app-color-border);
	color: var(--app-color-text-muted);
	font-size: 0.85rem;
}

.app-footer a {
	color: inherit;
}

@media (max-width: 680px) {
	.app-header {
		min-height: 64px;
	}

	.app-nav a {
		display: none;
	}

	.app-nav a:first-child {
		display: inline-flex;
	}

	.app-footer {
		flex-direction: column;
	}
}
</style>
