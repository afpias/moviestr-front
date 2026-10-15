import { createRouter, createWebHistory } from 'vue-router'

export const ROUTE_NAMES = {
	home: 'home',
	lobby: 'lobby',
	room: 'room',
	notFound: 'not-found'
} as const

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			component: () => import('@pages/game').then(({ GamePage }) => GamePage),
			meta: { title: 'Угадай фильм по кадру' },
			name: 'home',
			path: '/'
		},
		{
			component: () => import('@pages/lobby').then(({ LobbyPage }) => LobbyPage),
			meta: { title: 'Мультиплеер' },
			name: 'lobby',
			path: '/lobby'
		},
		{
			component: () => import('@pages/room').then(({ RoomPage }) => RoomPage),
			meta: { title: 'Комната' },
			name: 'room',
			path: '/lobby/:roomId'
		},
		{
			component: () => import('@pages/not-found').then(({ NotFoundPage }) => NotFoundPage),
			meta: { title: 'Страница не найдена' },
			name: 'not-found',
			path: '/:pathMatch(.*)*'
		}
	]
})

router.afterEach((route) => {
	document.title = route.meta.title ? `${route.meta.title} · Moviestr` : 'Moviestr'
})

export default router
