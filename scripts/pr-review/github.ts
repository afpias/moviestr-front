import { readFileSync } from 'node:fs'
import { env } from 'node:process'

import { record, sha, string } from './model.ts'

export function requiredEnv(name: string): string {
	return string(env[name], 20_000)
}

export function pullRequest(): { number: number; head: string; base: string } {
	const event = record(JSON.parse(readFileSync(requiredEnv('GITHUB_EVENT_PATH'), 'utf8')) as unknown)
	const pull = record(event.pull_request)
	if (typeof pull.number !== 'number' || !Number.isSafeInteger(pull.number)) throw new Error('Invalid PR')
	return { number: pull.number, head: sha(record(pull.head).sha), base: sha(record(pull.base).sha) }
}

export async function github(path: string, body?: unknown): Promise<unknown> {
	const response = await fetch(`https://api.github.com/repos/${requiredEnv('GITHUB_REPOSITORY')}/${path}`, {
		method: body === undefined ? 'GET' : 'POST',
		headers: {
			Authorization: `Bearer ${requiredEnv('GH_TOKEN')}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json'
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(30_000)
	})
	if (!response.ok) throw new Error(`GitHub API failed: HTTP ${response.status}`)
	return response.json() as Promise<unknown>
}
