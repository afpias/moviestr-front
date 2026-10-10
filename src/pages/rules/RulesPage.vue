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

<style scoped>
.content-page {
	max-width: 920px;
	margin-inline: auto;
}

.content-page__header {
	max-width: 650px;
}

.content-page__header h1 {
	font-size: clamp(2.75rem, 8vw, 5.5rem);
	font-weight: 850;
	letter-spacing: -0.065em;
}

.content-page__header > p:last-child {
	margin-top: 1rem;
	color: var(--app-color-text-muted);
	font-size: 1.1rem;
}

.rules-grid {
	margin-top: 3rem;
	display: grid;
	gap: 0.75rem;
}

.rules-grid > div,
.score-card {
	padding: 1.5rem;
	border: 1px solid var(--app-color-border);
	border-radius: var(--app-radius-medium);
	background: var(--app-color-surface);
}

.rules-grid span {
	color: var(--app-color-accent);
	font-size: 0.75rem;
	font-weight: 800;
}

.rules-grid h2 {
	margin-top: 1.5rem;
	font-size: 1.35rem;
	font-weight: 750;
}

.rules-grid p {
	margin-top: 0.5rem;
	color: var(--app-color-text-muted);
}

.score-card {
	margin-top: 0.75rem;
	display: grid;
	gap: 2rem;
}

.score-card h2 {
	max-width: 12ch;
	font-size: 1.8rem;
	font-weight: 800;
	line-height: 1.05;
}

.score-card ol {
	margin: 0;
	padding: 0;
	list-style: none;
}

.score-card li {
	display: flex;
	justify-content: space-between;
	gap: 2rem;
	padding-block: 0.65rem;
	border-bottom: 1px solid var(--app-color-border);
}

.score-card li:last-child {
	border: 0;
}

.score-card li span {
	color: var(--app-color-text-muted);
}

@media (min-width: 700px) {
	.rules-grid {
		grid-template-columns: repeat(3, 1fr);
	}

	.score-card {
		grid-template-columns: 1fr 1fr;
		padding: 2rem;
	}
}
</style>
