export async function enableBrowserMocks(): Promise<void> {
	if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === 'false') {
		return
	}

	const { worker } = await import('./browser')

	await worker.start({
		onUnhandledFrame: 'bypass'
	})
}
