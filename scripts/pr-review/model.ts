export interface Finding {
	priority: 'P0' | 'P1' | 'P2' | 'P3'
	path: string
	line: number
	title: string
	body: string
}

export interface Review {
	complete: boolean
	summary: string
	findings: Finding[]
}

export function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object')
	return value as Record<string, unknown>
}

export function string(value: unknown, max = 6000): string {
	if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid string')
	return value
}

export function sha(value: unknown): string {
	const result = string(value, 40)
	if (!/^[a-f0-9]{40}$/.test(result)) throw new Error('Invalid SHA')
	return result
}

export function parseReview(value: unknown): Review {
	const input = record(value)
	if (typeof input.complete !== 'boolean' || !Array.isArray(input.findings) || input.findings.length > 30)
		throw new Error('Invalid review')
	return {
		complete: input.complete,
		summary: string(input.summary),
		findings: input.findings.map((item: unknown): Finding => {
			const finding = record(item)
			const priority = finding.priority
			if (priority !== 'P0' && priority !== 'P1' && priority !== 'P2' && priority !== 'P3') throw new Error('Invalid priority')
			if (!Number.isSafeInteger(finding.line) || typeof finding.line !== 'number' || finding.line < 1)
				throw new Error('Invalid line')
			const path = string(finding.path, 500)
			if (path.startsWith('/') || path.includes('..') || /[\r\n\\]/.test(path)) throw new Error('Invalid path')
			return {
				priority,
				path,
				line: finding.line,
				title: string(finding.title, 200),
				body: string(finding.body, 3000)
			}
		})
	}
}

export function reviewEvent(review: Review): 'APPROVE' | 'REQUEST_CHANGES' {
	if (!review.complete) throw new Error('Incomplete review cannot approve')
	return review.findings.some((finding) => finding.priority !== 'P3') ? 'REQUEST_CHANGES' : 'APPROVE'
}

export function assertCurrent(artifact: Record<string, unknown>, current: { number: number; head: string; base: string }): void {
	if (artifact.number !== current.number || artifact.head !== current.head || artifact.base !== current.base)
		throw new Error('Stale or unrelated review')
}

export const reviewSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		complete: { type: 'boolean' },
		summary: { type: 'string' },
		findings: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				properties: {
					priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
					path: { type: 'string' },
					line: { type: 'integer' },
					title: { type: 'string' },
					body: { type: 'string' }
				},
				required: ['priority', 'path', 'line', 'title', 'body']
			}
		}
	},
	required: ['complete', 'summary', 'findings']
} as const
