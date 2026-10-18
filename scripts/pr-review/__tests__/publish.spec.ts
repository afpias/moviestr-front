import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ github: vi.fn(), readFileSync: vi.fn(), filePatch: vi.fn() }))
const base = 'a'.repeat(40)
const head = 'b'.repeat(40)
const pull = { number: 2, head, base }
const metadata = { state: 'open', draft: false, head: { sha: head }, base: { sha: base } }
const clean = { complete: true, summary: 'Нет замечаний', findings: [] }

vi.mock('node:fs', () => ({ readFileSync: mocks.readFileSync, default: { readFileSync: mocks.readFileSync } }))
vi.mock('../github.ts', () => ({
	github: mocks.github,
	pullRequest: () => pull,
	requiredEnv: (name: string) => name
}))
vi.mock('../context.ts', async (importOriginal) => {
	const original = await importOriginal<typeof import('../context.ts')>()
	return { ...original, filePatch: mocks.filePatch }
})

describe('publication boundary', () => {
	beforeEach(() => {
		vi.resetModules()
		mocks.github.mockReset().mockResolvedValue(metadata)
		mocks.readFileSync.mockReset().mockReturnValue(JSON.stringify({ ...pull, review: clean }))
		mocks.filePatch.mockReset().mockReturnValue('@@ -1 +1 @@\n-old\n+new')
		vi.stubEnv('ANALYSIS_RESULT', 'success')
	})
	afterEach(() => vi.unstubAllEnvs())

	it('publishes a SHA-bound approval and success status', async () => {
		await import('../publish.ts')
		expect(mocks.github).toHaveBeenCalledWith('pulls/2/reviews', expect.objectContaining({ commit_id: head, event: 'APPROVE' }))
		expect(mocks.github).toHaveBeenLastCalledWith(
			`statuses/${head}`,
			expect.objectContaining({ state: 'success', context: 'AI review' })
		)
	})

	it('publishes blocking inline findings and a failure status', async () => {
		mocks.readFileSync.mockReturnValue(
			JSON.stringify({
				...pull,
				review: {
					...clean,
					findings: [{ priority: 'P2', path: 'src/game.ts', line: 1, title: 'Ошибка', body: 'Условие и последствие' }]
				}
			})
		)
		await import('../publish.ts')
		expect(mocks.github).toHaveBeenCalledWith(
			'pulls/2/reviews',
			expect.objectContaining({ event: 'REQUEST_CHANGES', comments: [expect.objectContaining({ line: 1, side: 'RIGHT' })] })
		)
		expect(mocks.github).toHaveBeenLastCalledWith(`statuses/${head}`, expect.objectContaining({ state: 'failure' }))
	})

	it('does not approve failed analysis even when an artifact exists', async () => {
		vi.stubEnv('ANALYSIS_RESULT', 'failure')
		await expect(import('../publish.ts')).rejects.toThrow('Analysis failed')
		expect(mocks.github.mock.calls.some(([path]) => path === 'pulls/2/reviews')).toBe(false)
		expect(mocks.github).toHaveBeenLastCalledWith(`statuses/${head}`, expect.objectContaining({ state: 'failure' }))
	})

	it('rejects invalid inline positions without posting a partial review', async () => {
		mocks.readFileSync.mockReturnValue(
			JSON.stringify({
				...pull,
				review: { ...clean, findings: [{ priority: 'P2', path: 'src/game.ts', line: 99, title: 'Ошибка', body: 'Описание' }] }
			})
		)
		await expect(import('../publish.ts')).rejects.toThrow('added line')
		expect(mocks.github.mock.calls.some(([path]) => path === 'pulls/2/reviews')).toBe(false)
	})

	it('rejects an artifact for a different head', async () => {
		mocks.readFileSync.mockReturnValue(JSON.stringify({ ...pull, head: base, review: clean }))
		await expect(import('../publish.ts')).rejects.toThrow('Stale')
		expect(mocks.github.mock.calls.some(([path]) => path === 'pulls/2/reviews')).toBe(false)
	})

	it('rechecks SHA immediately before posting', async () => {
		mocks.github.mockResolvedValueOnce(metadata).mockResolvedValueOnce({ ...metadata, head: { sha: base } })
		await expect(import('../publish.ts')).rejects.toThrow('Stale')
		expect(mocks.github.mock.calls.some(([path]) => path === 'pulls/2/reviews')).toBe(false)
	})

	it('does not turn an API failure into successful review', async () => {
		mocks.github.mockResolvedValueOnce(metadata).mockResolvedValueOnce(metadata).mockRejectedValueOnce(new Error('HTTP 403'))
		await expect(import('../publish.ts')).rejects.toThrow('HTTP 403')
		expect(mocks.github).toHaveBeenLastCalledWith(`statuses/${head}`, expect.objectContaining({ state: 'failure' }))
	})
})
