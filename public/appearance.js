/* global document, localStorage, location */
;(function () {
	let theme = 'dark'
	let preferences = null
	let hasSavedGame = false
	try {
		const savedTheme = JSON.parse(localStorage.getItem('moviestr:theme:v1'))
		if (savedTheme === 'dark' || savedTheme === 'light') theme = savedTheme
	} catch {
		/* Use the safe default before any application modules load. */
	}
	try {
		const saved = JSON.parse(localStorage.getItem('moviestr:game-preferences:v1'))
		if (
			saved &&
			saved.version === 1 &&
			['easy', 'medium', 'hard', 'expert', 'impossible'].includes(saved.difficulty) &&
			['all', 'action', 'comedy', 'drama', 'thriller', 'horror', 'science-fiction', 'animation'].includes(saved.genre)
		)
			preferences = saved
	} catch {
		/* Preferences are optional and never contain a frame or answer. */
	}
	try {
		hasSavedGame = Boolean(localStorage.getItem('moviestr:game:v2'))
	} catch {
		/* A blocked storage must not prevent the application from starting. */
	}
	document.documentElement.classList.toggle('app-dark', theme === 'dark')
	document.documentElement.style.colorScheme = theme
	if (location.pathname === '/') {
		document.documentElement.dataset.gameDifficulty = preferences ? preferences.difficulty : hasSavedGame ? 'loading' : 'easy'
	}
})()
