import { eslint } from '@afpia/eslint'

export default eslint(
	{
		typescript: true,
		import: true
	},
	{
		name: 'moviestr/ignores',
		ignores: ['**/*.md', 'public/mockServiceWorker.js']
	},
	{
		name: 'moviestr/prettier-compatibility',
		files: ['**/*.vue'],
		rules: {
			'vue/html-closing-bracket-newline': 'off',
			'vue/html-comment-content-spacing': 'off',
			'vue/html-indent': 'off',
			'vue/html-self-closing': 'off',
			'vue/singleline-html-element-content-newline': 'off'
		}
	}
)
