<script setup lang="ts">
import { DIFFICULTY_OPTIONS } from '@shared/lib/game-difficulty'
</script>

<template>
	<article class="content-page">
		<header class="content-page__header">
			<p class="eyebrow">Solo · image mode</p>
			<h1>Правила игры</h1>
			<p>Игра начинается сразу. Определи фильм по кадрам или переключись на другой режим.</p>
		</header>

		<section class="rules-grid" aria-label="Основные правила">
			<div>
				<span>01</span>
				<h2>Смотри</h2>
				<p>Начни с самого сложного кадра. Одновременно виден только один.</p>
			</div>
			<div>
				<span>02</span>
				<h2>Выбирай</h2>
				<p>Найди русское, английское или оригинальное название и выбери фильм из списка.</p>
			</div>
			<div>
				<span>03</span>
				<h2>Угадывай или пропускай</h2>
				<p>Без выбранного фильма кнопка покажет следующий кадр. Верный ответ повысит сложность.</p>
			</div>
		</section>

		<section class="difficulty-card">
			<header>
				<p class="eyebrow">Пять режимов</p>
				<h2>Выбери знакомость фильмов</h2>
				<p>Сложность определяет часть топа 250 TMDB. На другой режим можно перейти в любой момент.</p>
			</header>
			<ul>
				<li v-for="option in DIFFICULTY_OPTIONS" :key="option.value" :class="`is-${option.value}`">
					<div>
						<strong>{{ option.label }}</strong>
						<span>{{ option.description }}</span>
					</div>
					<small>{{ option.startRank }}–{{ option.endRank }}</small>
				</li>
			</ul>
		</section>

		<p class="content-page__note">Очки появятся в будущем многопользовательском режиме для соревнований.</p>
	</article>
</template>

<style scoped src="./RulesPage.css"></style>
