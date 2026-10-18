import { execFileSync } from 'node:child_process'

const MAX_CONTEXT = 250_000

export function git(...args: string[]): string {
	return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 2_000_000 })
}

export function limitContext(value: string): string {
	if (value.length > MAX_CONTEXT) throw new Error('Review context too large; split this PR')
	return value
}

export function addedLines(patch: string): Set<number> {
	const lines = new Set<number>()
	let line = 0
	let inHunk = false
	for (const entry of patch.split('\n')) {
		const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(entry)
		if (hunk) {
			line = Number(hunk[1])
			inHunk = true
		} else if (inHunk && entry.startsWith('+')) {
			lines.add(line++)
		} else if (inHunk && entry.startsWith(' ')) {
			line++
		}
	}
	return lines
}

export function filePatch(base: string, head: string, path: string): string {
	return git('diff', '--no-ext-diff', '--no-textconv', '--unified=3', `${base}...${head}`, '--', path)
}

export function collectContext(base: string, head: string): string {
	const paths = git('diff', '--name-only', '-z', `${base}...${head}`).split('\0').filter(Boolean)
	const guidance = git('ls-tree', '-r', '--name-only', base)
		.split('\n')
		.filter((path) => /(?:^|\/)AGENTS\.md$/.test(path) || /^docs\/.+\/(?:spec|plan|tasks)\.md$/.test(path))
	const files = paths.map((path) => {
		if (/(?:^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key|p12))$/.test(path) && !path.endsWith('.example'))
			throw new Error('Potential secret file in PR; manual inspection required')
		const exists = git('ls-tree', head, '--', path).trim()
		const content = exists ? git('show', `${head}:${path}`) : '(deleted)'
		if (content.includes('\0')) throw new Error('Binary change requires manual inspection')
		return { path, content }
	})
	return limitContext(
		JSON.stringify({
			guidance: guidance.map((path) => ({ path, content: git('show', `${base}:${path}`) })),
			diff: git('diff', '--no-ext-diff', '--no-textconv', `${base}...${head}`),
			files
		})
	)
}
