import { eslint } from '@afpia/eslint'

export default eslint(
	{
		typescript: true,
		import: true
	},
	{
		name: 'moviestr/ignores',
		ignores: ['**/*.md']
	},
	{
		name: 'moviestr/classic-appearance-script',
		files: ['public/appearance.js'],
		rules: {
			// The typed unused-vars rule cannot track value references from Espree's plain JS scopes.
			'unused-imports/no-unused-vars': 'off',
			'no-unused-vars': [
				'error',
				{ vars: 'all', args: 'after-used', ignoreRestSiblings: true, varsIgnorePattern: '^_', argsIgnorePattern: '^_' }
			]
		}
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
