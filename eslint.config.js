import { eslint } from '@afpia/eslint'

export default eslint(
	{
		import: true,
		stylistic: true,
		typescript: true
	},
	{
		name: 'moviestr/ignores',
		ignores: ['**/*.md', 'public/mockServiceWorker.js']
	},
	{
		name: 'moviestr/vue-formatting',
		files: ['**/*.vue'],
		rules: {
			'vue/html-closing-bracket-newline': 'off',
			'vue/html-comment-content-spacing': 'off',
			'vue/html-indent': 'off',
			'vue/html-self-closing': 'off',
			'vue/singleline-html-element-content-newline': 'off'
		}
	},
	{
		name: 'moviestr/default-exports',
		files: ['*.config.{js,ts}', 'src/router/**/*.ts'],
		rules: {
			'import/no-default-export': 'off'
		}
	}
)
