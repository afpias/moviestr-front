<template>
	<section class="home-page">
		<div class="home-page__copy">
			<p class="eyebrow">Киноигра для внимательных</p>
			<h1>Узнай фильм.<br /><span>Кадр за кадром.</span></h1>
			<p class="home-page__lead">
				Шесть кадров, шесть попыток и максимум 600 очков. Чем раньше узнаешь фильм, тем выше результат.
			</p>
			<div class="home-page__notice" role="status">
				<i class="pi pi-sparkles" aria-hidden="true"></i>
				<span>Игровая коллекция готовится к подключению</span>
			</div>
		</div>

		<div class="film-preview" aria-label="Пример последовательности кадров">
			<div class="film-preview__screen">
				<span class="film-preview__glow"></span>
				<span class="film-preview__planet"></span>
				<p>Сможешь узнать с первого кадра?</p>
			</div>
			<ol class="film-preview__steps" aria-label="Шесть попыток">
				<li v-for="step in 6" :key="step" :class="{ 'is-active': step === 1 }">{{ step }}</li>
			</ol>
		</div>
	</section>
</template>

<style scoped>
.home-page {
	display: grid;
	align-items: center;
	gap: clamp(2.5rem, 8vw, 7rem);
}

.eyebrow {
	margin-bottom: 1rem;
	color: var(--app-color-accent);
	font-size: 0.78rem;
	font-weight: 800;
	letter-spacing: 0.14em;
	text-transform: uppercase;
}

h1 {
	max-width: 11ch;
	font-size: clamp(3rem, 12vw, 6.8rem);
	font-weight: 850;
	letter-spacing: -0.075em;
	line-height: 0.9;
}

h1 span {
	color: var(--app-color-text-muted);
}

.home-page__lead {
	max-width: 38rem;
	margin-top: 1.75rem;
	color: var(--app-color-text-muted);
	font-size: clamp(1rem, 2vw, 1.15rem);
}

.home-page__notice {
	width: fit-content;
	margin-top: 2rem;
	display: flex;
	align-items: center;
	gap: 0.65rem;
	padding: 0.8rem 1rem;
	border: 1px solid var(--app-color-border);
	border-radius: 999px;
	background: var(--app-color-surface);
	color: var(--app-color-text-muted);
	font-size: 0.88rem;
}

.home-page__notice i {
	color: var(--app-color-accent);
}

.film-preview {
	min-width: 0;
	padding: 0.65rem;
	border: 1px solid var(--app-color-border);
	border-radius: var(--app-radius-large);
	background: var(--app-color-surface);
	box-shadow: var(--app-shadow-large);
	transform: rotate(1.5deg);
}

.film-preview__screen {
	position: relative;
	aspect-ratio: 16 / 10;
	overflow: hidden;
	display: grid;
	place-items: end start;
	padding: 1.5rem;
	border-radius: calc(var(--app-radius-large) - 0.4rem);
	background:
		radial-gradient(circle at 72% 30%, rgb(255 112 82 / 35%), transparent 22%),
		linear-gradient(145deg, #080b17 12%, #273257 58%, #9f4f3c 100%);
}

.film-preview__screen::before {
	content: '';
	position: absolute;
	inset: 58% -10% -20%;
	background: #0d101b;
	transform: rotate(-6deg);
}

.film-preview__screen p {
	position: relative;
	z-index: 2;
	max-width: 14ch;
	color: #fff;
	font-size: clamp(1.2rem, 4vw, 2rem);
	font-weight: 750;
	line-height: 1.05;
}

.film-preview__planet {
	position: absolute;
	top: 18%;
	right: 13%;
	width: 28%;
	aspect-ratio: 1;
	border-radius: 50%;
	background: linear-gradient(135deg, #ffb36b, #8e3c47 68%, #32192b);
	box-shadow: -25px 20px 50px rgb(0 0 0 / 45%);
}

.film-preview__glow {
	position: absolute;
	top: 28%;
	left: 22%;
	width: 3px;
	height: 3px;
	border-radius: 50%;
	background: #fff;
	box-shadow:
		42px -28px #fff,
		96px 14px #fff,
		150px -44px #fff,
		210px 18px #fff,
		-32px 54px #fff;
}

.film-preview__steps {
	margin: 0;
	padding: 1rem 0.4rem 0.35rem;
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 0.45rem;
	list-style: none;
}

.film-preview__steps li {
	aspect-ratio: 1;
	display: grid;
	place-items: center;
	border: 1px solid var(--app-color-border);
	border-radius: 50%;
	color: var(--app-color-text-muted);
	font-size: 0.78rem;
	font-weight: 750;
}

.film-preview__steps .is-active {
	border-color: var(--app-color-accent);
	background: var(--app-color-accent);
	color: var(--app-color-on-accent);
}

@media (min-width: 900px) {
	.home-page {
		grid-template-columns: minmax(0, 1fr) minmax(360px, 0.72fr);
	}
}
</style>
