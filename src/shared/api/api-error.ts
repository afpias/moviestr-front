export interface ApiErrorBody {
	code: string
	message: string
	requestId?: string
}

export class ApiError extends Error {
	readonly code: string
	readonly requestId?: string
	readonly status: number

	constructor(status: number, body: ApiErrorBody) {
		super(body.message)
		this.name = 'ApiError'
		this.code = body.code
		this.requestId = body.requestId
		this.status = status
	}
}
