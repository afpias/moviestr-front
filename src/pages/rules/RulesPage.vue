<script setup lang="ts">
const SCORE_RULES = [600, 500, 400, 300, 200, 100]
</script>

<template>
	<article class="content-page">
		<header class="content-page__header">
			<p class="eyebrow">Всё просто</p>
			<h1>Правила игры</h1>
			<p>Определи фильм по кадрам. Каждый неверный ответ открывает более узнаваемую сцену.</p>
		</header>

		<section class="rules-grid" aria-label="Основные правила">
			<div>
				<span>01</span>
				<h2>Смотри</h2>
				<p>Начни с самого сложного кадра. Одновременно виден только один.</p>
			</div>
			<div>
				<span>02</span>
				<h2>Вспоминай</h2>
				<p>Введи русское или оригинальное название фильма.</p>
			</div>
			<div>
				<span>03</span>
				<h2>Рискуй</h2>
				<p>У тебя шесть попыток. Чем раньше ответишь, тем больше очков.</p>
			</div>
		</section>

		<section class="score-card">
			<div>
				<p class="eyebrow">Система очков</p>
				<h2>Первый кадр — лучший результат</h2>
			</div>
			<ol>
				<li v-for="(score, index) in SCORE_RULES" :key="score">
					<span>Кадр {{ index + 1 }}</span>
					<strong>{{ score }}</strong>
				</li>
			</ol>
		</section>
	</article>
</template>

<style scoped src="./RulesPage.css"></style>
