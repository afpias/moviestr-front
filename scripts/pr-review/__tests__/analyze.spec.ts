import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), write: vi.fn() }))
const pull = { number: 2, head: 'b'.repeat(40), base: 'a'.repeat(40) }
const review = { complete: true, summary: 'Нет найденных дефектов', findings: [] }

vi.mock('node:fs', () => {
	const fs = { readFileSync: () => 'Trusted review instructions', writeFileSync: mocks.write }
	return { ...fs, default: fs }
})
vi.mock('../context.ts', () => ({ collectContext: () => '{"diff":"untrusted data"}' }))
vi.mock('../github.ts', () => ({
	pullRequest: () => pull,
	requiredEnv: (name: string) => name
}))

function completed(text: string): Response {
	return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] })
}

describe('analysis boundary', () => {
	beforeEach(() => {
		vi.resetModules()
		mocks.write.mockReset()
		mocks.fetch.mockReset().mockResolvedValue(completed(JSON.stringify(review)))
		vi.stubGlobal('fetch', mocks.fetch)
	})
	afterEach(() => vi.unstubAllGlobals())

	it('requests structured data without tools and saves only a complete result', async () => {
		await import('../analyze.ts')
		const body = JSON.parse(mocks.fetch.mock.calls[0]?.[1].body as string) as Record<string, unknown>
		expect(body.store).toBe(false)
		expect(body.model).toBe('OPENAI_REVIEW_MODEL')
		expect(body.tools).toBeUndefined()
		expect(body.text).toEqual(expect.objectContaining({ format: expect.objectContaining({ type: 'json_schema', strict: true }) }))
		expect(mocks.write).toHaveBeenCalledWith('REVIEW_OUTPUT', JSON.stringify({ ...pull, review }))
	})

	it.each([
		{ status: 'incomplete', output: [] },
		{ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] },
		{ status: 'completed', output: [] }
	])('does not write an artifact for unsupported response %j', async (value) => {
		mocks.fetch.mockResolvedValue(Response.json(value))
		await expect(import('../analyze.ts')).rejects.toThrow()
		expect(mocks.write).not.toHaveBeenCalled()
	})

	it('does not write incomplete review coverage', async () => {
		mocks.fetch.mockResolvedValue(completed(JSON.stringify({ ...review, complete: false })))
		await expect(import('../analyze.ts')).rejects.toThrow('coverage')
		expect(mocks.write).not.toHaveBeenCalled()
	})

	it('does not expose API error bodies', async () => {
		mocks.fetch.mockResolvedValue(new Response('potentially sensitive upstream body', { status: 401 }))
		await expect(import('../analyze.ts')).rejects.toThrow('OpenAI API failed: HTTP 401')
		expect(mocks.write).not.toHaveBeenCalled()
	})
})
