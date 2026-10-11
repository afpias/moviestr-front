import { createRouter, createWebHistory } from 'vue-router'

export const ROUTE_NAMES = {
	home: 'home',
	notFound: 'not-found',
	rules: 'rules',
	statistics: 'statistics'
} as const

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			component: () => import('@pages/game/GamePage.vue'),
			meta: { title: 'Угадай фильм по кадру' },
			name: 'home',
			path: '/'
		},
		{
			component: () => import('@pages/rules/RulesPage.vue'),
			meta: { title: 'Правила' },
			name: 'rules',
			path: '/rules'
		},
		{
			component: () => import('@pages/statistics/StatisticsPage.vue'),
			meta: { title: 'Статистика' },
			name: 'statistics',
			path: '/statistics'
		},
		{
			component: () => import('@pages/not-found/NotFoundPage.vue'),
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
