import { isNumber, isRecord, isString } from '@shared/lib/type-guards'

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'

export interface TmdbMovie {
	id: number
	originalTitle: string
	popularity: number
	posterPath: string | null
	releaseDate: string
	title: string
	voteCount: number
}

export interface TmdbMoviePage {
	movies: TmdbMovie[]
	page: number
	totalPages: number
	totalResults: number
}

export interface TmdbImage {
	filePath: string
	height: number
	language: string | null
	voteAverage: number
	voteCount: number
	width: number
}

export class TmdbApiError extends Error {
	constructor(
		readonly code: 'SERVICE_NOT_CONFIGURED' | 'UPSTREAM_ERROR',
		message: string,
		readonly status: number
	) {
		super(message)
		this.name = 'TmdbApiError'
	}
}

function getReadToken(): string {
	const token = import.meta.env.VITE_TMDB_READ_TOKEN?.trim()

	if (!token) {
		throw new TmdbApiError('SERVICE_NOT_CONFIGURED', 'VITE_TMDB_READ_TOKEN is not configured', 503)
	}

	return token
}

function isNullableString(value: unknown): value is null | string {
	return value === null || isString(value)
}

function parseMovie(value: unknown): TmdbMovie | null {
	if (
		!isRecord(value) ||
		!isNumber(value.id) ||
		!isString(value.original_title) ||
		!isNumber(value.popularity) ||
		!isNullableString(value.poster_path) ||
		!isString(value.release_date) ||
		!isString(value.title) ||
		!isNumber(value.vote_count)
	) {
		return null
	}

	return {
		id: value.id,
		originalTitle: value.original_title,
		popularity: value.popularity,
		posterPath: value.poster_path,
		releaseDate: value.release_date,
		title: value.title,
		voteCount: value.vote_count
	}
}

function parseMovieList(value: unknown): TmdbMovie[] {
	if (!isRecord(value) || !Array.isArray(value.results)) {
		throw new TmdbApiError('UPSTREAM_ERROR', 'TMDB returned an invalid movie list', 502)
	}

	const movies: TmdbMovie[] = []

	for (const result of value.results) {
		const movie = parseMovie(result)

		if (movie) {
			movies.push(movie)
		}
	}

	return movies
}

function parseMoviePage(value: unknown): TmdbMoviePage {
	if (
		!isRecord(value) ||
		!isNumber(value.page) ||
		!Number.isInteger(value.page) ||
		value.page < 1 ||
		!isNumber(value.total_pages) ||
		!Number.isInteger(value.total_pages) ||
		value.total_pages < 0 ||
		!isNumber(value.total_results) ||
		!Number.isInteger(value.total_results) ||
		value.total_results < 0
	) {
		throw new TmdbApiError('UPSTREAM_ERROR', 'TMDB returned invalid movie pagination', 502)
	}

	return {
		movies: parseMovieList(value),
		page: value.page,
		totalPages: value.total_pages,
		totalResults: value.total_results
	}
}

function parseImages(value: unknown): TmdbImage[] {
	if (!isRecord(value) || !Array.isArray(value.backdrops)) {
		throw new TmdbApiError('UPSTREAM_ERROR', 'TMDB returned an invalid image list', 502)
	}

	const images: TmdbImage[] = []

	for (const backdrop of value.backdrops) {
		if (
			isRecord(backdrop) &&
			isString(backdrop.file_path) &&
			isNumber(backdrop.height) &&
			isNullableString(backdrop.iso_639_1) &&
			isNumber(backdrop.vote_average) &&
			isNumber(backdrop.vote_count) &&
			isNumber(backdrop.width)
		) {
			images.push({
				filePath: backdrop.file_path,
				height: backdrop.height,
				language: backdrop.iso_639_1,
				voteAverage: backdrop.vote_average,
				voteCount: backdrop.vote_count,
				width: backdrop.width
			})
		}
	}

	return images
}

function parseAlternativeTitles(value: unknown): string[] {
	if (!isRecord(value) || !Array.isArray(value.titles)) {
		throw new TmdbApiError('UPSTREAM_ERROR', 'TMDB returned invalid alternative titles', 502)
	}

	return value.titles.flatMap((alternativeTitle) =>
		isRecord(alternativeTitle) && isString(alternativeTitle.title) ? [alternativeTitle.title] : []
	)
}

async function requestTmdb(path: string, searchParams: Record<string, number | string> = {}): Promise<unknown> {
	const url = new URL(`${TMDB_API_BASE_URL}${path}`)

	for (const [name, value] of Object.entries(searchParams)) {
		url.searchParams.set(name, String(value))
	}

	let response: Response

	try {
		response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${getReadToken()}`
			}
		})
	} catch {
		throw new TmdbApiError('UPSTREAM_ERROR', 'TMDB request failed', 502)
	}

	if (!response.ok) {
		throw new TmdbApiError('UPSTREAM_ERROR', `TMDB responded with status ${response.status}`, 502)
	}

	try {
		return await response.json()
	} catch {
		throw new TmdbApiError('UPSTREAM_ERROR', 'TMDB returned invalid JSON', 502)
	}
}

export function assertTmdbConfigured(): void {
	getReadToken()
}

export async function getKnownMoviesPage(page: number, genreId: number | null): Promise<TmdbMoviePage> {
	const searchParams: Record<string, number | string> = {
		include_adult: 'false',
		include_video: 'false',
		language: 'ru-RU',
		page,
		sort_by: 'vote_count.desc'
	}

	if (genreId !== null) {
		searchParams.with_genres = genreId
	}

	return parseMoviePage(await requestTmdb('/discover/movie', searchParams))
}

export async function getMovieDetails(movieId: number, language: 'en-US' | 'ru-RU'): Promise<TmdbMovie> {
	const movie = parseMovie(await requestTmdb(`/movie/${movieId}`, { language }))

	if (!movie) {
		throw new TmdbApiError('UPSTREAM_ERROR', 'TMDB returned invalid movie details', 502)
	}

	return movie
}

export async function getMovieImages(movieId: number): Promise<TmdbImage[]> {
	return parseImages(
		await requestTmdb(`/movie/${movieId}/images`, {
			include_image_language: 'null,en,ru'
		})
	)
}

export async function getAlternativeTitles(movieId: number): Promise<string[]> {
	return parseAlternativeTitles(await requestTmdb(`/movie/${movieId}/alternative_titles`))
}

export async function searchTmdbMovies(query: string, language: 'en-US' | 'ru-RU'): Promise<TmdbMovie[]> {
	return parseMovieList(
		await requestTmdb('/search/movie', {
			include_adult: 'false',
			language,
			query
		})
	)
}
