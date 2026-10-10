import commitlintConfig from '@afpia/commitlint'

export default {
	...commitlintConfig,
	prompt: {
		...commitlintConfig.prompt,
		questions: {
			...commitlintConfig.prompt?.questions,
			subject: {
				...commitlintConfig.prompt?.questions?.subject,
				description: 'Напишите краткое описание изменений на русском языке в форме родительного падежа'
			}
		}
	}
}
