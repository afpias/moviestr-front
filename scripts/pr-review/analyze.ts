import { readFileSync, writeFileSync } from 'node:fs'

import { collectContext } from './context.ts'
import { pullRequest, requiredEnv } from './github.ts'
import { parseReview, record, reviewSchema, string } from './model.ts'

const pull = pullRequest()
const context = collectContext(pull.base, pull.head)
const response = await fetch('https://api.openai.com/v1/responses', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${requiredEnv('OPENAI_API_KEY')}`,
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		model: requiredEnv('OPENAI_REVIEW_MODEL'),
		store: false,
		max_output_tokens: 12_000,
		instructions: readFileSync('.github/review-instructions.md', 'utf8'),
		input: context,
		text: { format: { type: 'json_schema', name: 'pr_review', strict: true, schema: reviewSchema } }
	}),
	signal: AbortSignal.timeout(180_000)
})
if (!response.ok) throw new Error(`OpenAI API failed: HTTP ${response.status}`)
const result = record((await response.json()) as unknown)
if (result.status !== 'completed' || !Array.isArray(result.output)) throw new Error('Incomplete API response')
const text: string[] = []
for (const item of result.output) {
	const message = record(item)
	if (message.type !== 'message') continue
	if (!Array.isArray(message.content)) throw new Error('Missing response content')
	for (const entry of message.content) {
		const content = record(entry)
		if (content.type !== 'output_text') throw new Error('Model refused or returned unsupported content')
		text.push(string(content.text, 100_000))
	}
}
const review = parseReview(JSON.parse(text.join('')) as unknown)
if (!review.complete) throw new Error('Model reports insufficient review coverage')
writeFileSync(requiredEnv('REVIEW_OUTPUT'), JSON.stringify({ ...pull, review }))
