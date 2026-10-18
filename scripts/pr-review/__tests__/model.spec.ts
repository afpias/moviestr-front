import { describe, expect, it } from 'vitest'

import { addedLines, limitContext } from '../context.ts'
import { assertCurrent, parseReview, reviewEvent, sha } from '../model.ts'

const base = 'a'.repeat(40)
const head = 'b'.repeat(40)
const clean = { complete: true, summary: 'Проблем не найдено', findings: [] }
const finding = { priority: 'P2', path: 'src/game.ts', line: 10, title: 'Ошибка', body: 'Условие и последствие' }

describe('pr review boundary', () => {
	it('approves a complete review without blocking findings', () => {
		expect(reviewEvent(parseReview(clean))).toBe('APPROVE')
		expect(reviewEvent(parseReview({ ...clean, findings: [{ ...finding, priority: 'P3' }] }))).toBe('APPROVE')
	})

	it.each(['P0', 'P1', 'P2'])('requests changes for %s', (priority) => {
		expect(reviewEvent(parseReview({ ...clean, findings: [{ ...finding, priority }] }))).toBe('REQUEST_CHANGES')
	})

	it('never approves incomplete or malformed results', () => {
		expect(() => reviewEvent(parseReview({ ...clean, complete: false }))).toThrow('Incomplete')
		for (const value of [null, {}, { ...clean, complete: 'true' }, { ...clean, findings: null }])
			expect(() => parseReview(value)).toThrow()
	})

	it.each([
		{ priority: 'P4' },
		{ path: '../secret' },
		{ path: '/absolute' },
		{ path: 'src\\file.ts' },
		{ line: 0 },
		{ line: 1.5 },
		{ title: '' },
		{ body: 'a'.repeat(3001) }
	])('rejects invalid finding %j', (invalid) => {
		expect(() => parseReview({ ...clean, findings: [{ ...finding, ...invalid }] })).toThrow()
	})

	it('binds output to PR, head and base', () => {
		const current = { number: 2, head, base }
		expect(() => assertCurrent(current, current)).not.toThrow()
		for (const altered of [{ number: 3 }, { head: base }, { base: head }])
			expect(() => assertCurrent({ ...current, ...altered }, current)).toThrow('Stale')
	})

	it('validates SHA before constructing git revisions', () => {
		expect(sha(head)).toBe(head)
		expect(() => sha('--output=secret')).toThrow()
		expect(() => sha(`${head}; echo token`)).toThrow()
	})

	it('does not silently truncate oversized context', () => {
		expect(limitContext('a'.repeat(250_000))).toHaveLength(250_000)
		expect(() => limitContext('a'.repeat(250_001))).toThrow('split this PR')
	})

	it('allows added right-side lines only, across multiple hunks', () => {
		const patch = [
			'--- a/src/game.ts',
			'+++ b/src/game.ts',
			'@@ -8,3 +8,4 @@',
			' same',
			'-old',
			'+new',
			'+extra',
			' same',
			'@@ -20 +21 @@',
			'-old',
			'+new'
		].join('\n')
		expect([...addedLines(patch)]).toEqual([9, 10, 21])
	})
})
