import { readFileSync } from 'node:fs'
import { env } from 'node:process'

import { addedLines, filePatch } from './context.ts'
import { github, pullRequest, requiredEnv } from './github.ts'
import { assertCurrent, parseReview, record, reviewEvent, sha } from './model.ts'

const pull = pullRequest()
const currentPull = record(await github(`pulls/${pull.number}`))
const current = {
	number: pull.number,
	head: sha(record(currentPull.head).sha),
	base: sha(record(currentPull.base).sha)
}
assertCurrent(pull, current)
if (currentPull.state !== 'open' || currentPull.draft !== false) throw new Error('PR no longer reviewable')
const targetUrl = `https://github.com/${requiredEnv('GITHUB_REPOSITORY')}/actions/runs/${requiredEnv('GITHUB_RUN_ID')}`

async function status(state: 'failure' | 'success', description: string): Promise<void> {
	await github(`statuses/${pull.head}`, { state, context: 'AI review', description, target_url: targetUrl })
}

try {
	if (env.ANALYSIS_RESULT !== 'success') throw new Error('Analysis failed; no approval issued')
	const artifact = record(JSON.parse(readFileSync(requiredEnv('REVIEW_OUTPUT'), 'utf8')) as unknown)
	assertCurrent(artifact, current)
	const review = parseReview(artifact.review)
	const event = reviewEvent(review)
	const comments = []
	for (const finding of review.findings) {
		if (!addedLines(filePatch(pull.base, pull.head, finding.path)).has(finding.line))
			throw new Error('Finding must refer to an added line in this diff')
		comments.push({
			path: finding.path,
			line: finding.line,
			side: 'RIGHT',
			body: `[${finding.priority}] ${finding.title}\n\n${finding.body}`
		})
	}
	// Recheck immediately before sending a formal review; commit_id binds it to this revision.
	const latest = record(await github(`pulls/${pull.number}`))
	assertCurrent(pull, { number: pull.number, head: sha(record(latest.head).sha), base: sha(record(latest.base).sha) })
	await github(`pulls/${pull.number}/reviews`, {
		commit_id: pull.head,
		event,
		body: `<!-- moviestr-ai-review:${pull.head} -->\n${review.summary}\n\nAI-ревью дополняет CI; слияние выполняет владелец вручную.`,
		comments
	})
	await status(
		event === 'APPROVE' ? 'success' : 'failure',
		event === 'APPROVE' ? 'Нет блокирующих замечаний' : 'Требуются исправления'
	)
} catch (error) {
	await status('failure', 'Ревью не завершено или обнаружена ошибка')
	throw error
}
