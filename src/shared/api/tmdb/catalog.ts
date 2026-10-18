import { getDifficultySlice } from '@shared/lib/game-difficulty'
import { getGameGenreOption } from '@shared/lib/game-genres'
import { GAME_FRAME_COUNT } from '@shared/lib/game-rules'
import { rankMoviesByKnownness } from '@shared/lib/movie-knownness'
import type { GameDifficulty, GameFrame, GameGenre, MovieCollectionSummary, MovieSuggestion } from '@shared/types/game'

import { getKnownMoviesPage, getMovieBundle, searchTmdbMovies, type TmdbMovie, type TmdbMoviePage } from './client'
import { type ImageTextRecognizer, selectSafeBackdrops } from './frame-selection'
import { recognizeTmdbImageText } from './ocr'

const MAX_MOVIE_ATTEMPTS = 8
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const TMDB_MAX_ACCESSIBLE_PAGES = 500
const TMDB_PAGE_SIZE = 20
const moviePageCache = new Map<string, Promise<TmdbMoviePage>>()
const testImageTextRecognizer: ImageTextRecognizer = async () => ''

export const TMDB_COLLECTION_ID = 'tmdb-catalog'

export interface CatalogMovie {
	aliases: string[]
	frames: GameFrame[]
	id: string
	originalTitle: string
	posterUrl: string
	releaseYear: number
	title: string
}

function getReleaseYear(releaseDate: string): number | null {
	const year = Number.parseInt(releaseDate.slice(0, 4), 10)

	return Number.isInteger(year) && year > 1800 ? year : null
}

function createImageUrl(path: string, size: 'w500' | 'w780' | 'w1280'): string {
	return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

function uniqueTitles(titles: readonly string[]): string[] {
	return [...new Set(titles.map((title) => title.trim()).filter((title) => title.length > 0))]
}

async function createCatalogMovie(candidate: TmdbMovie, recognizeImageText: ImageTextRecognizer): Promise<CatalogMovie | null> {
	const { alternativeTitles, images, movie } = await getMovieBundle(candidate.id)
	const aliases = uniqueTitles([movie.title, movie.originalTitle, ...alternativeTitles])
	const backdrops = await selectSafeBackdrops(
		images,
		aliases,
		(filePath) => createImageUrl(filePath, 'w1280'),
		recognizeImageText
	)
	const releaseYear = getReleaseYear(movie.releaseDate)
	const posterPath = movie.posterPath

	if (backdrops.length < GAME_FRAME_COUNT || releaseYear === null || posterPath === null) {
		return null
	}

	return {
		aliases,
		frames: backdrops.map((backdrop, index) => ({
			alt: `Кадр ${index + 1} из загаданного фильма`,
			index,
			url: createImageUrl(backdrop.filePath, 'w1280')
		})),
		id: `tmdb-${candidate.id}`,
		originalTitle: movie.originalTitle,
		posterUrl: createImageUrl(posterPath, 'w780'),
		releaseYear,
		title: movie.title
	}
}

function orderCandidates(movies: readonly TmdbMovie[], preferredIndex: number): TmdbMovie[] {
	return [...movies.slice(preferredIndex), ...movies.slice(0, preferredIndex)]
}

function getPageCacheKey(genre: GameGenre, page: number): string {
	return `${genre}:${page}`
}

async function requestMoviePage(genre: GameGenre, page: number): Promise<TmdbMoviePage> {
	const genreId = getGameGenreOption(genre).tmdbId

	return getKnownMoviesPage(page, genreId)
}

async function getMoviePage(genre: GameGenre, page: number): Promise<TmdbMoviePage> {
	if (import.meta.env.MODE === 'test') {
		return requestMoviePage(genre, page)
	}

	const cacheKey = getPageCacheKey(genre, page)
	const cachedPage = moviePageCache.get(cacheKey)

	if (cachedPage) {
		return cachedPage
	}

	const moviePage = requestMoviePage(genre, page).catch((error: unknown) => {
		moviePageCache.delete(cacheKey)
		throw error
	})

	moviePageCache.set(cacheKey, moviePage)

	return moviePage
}

function getAccessibleMovieCount(moviePage: TmdbMoviePage): number {
	const accessiblePageCount = Math.min(moviePage.totalPages, TMDB_MAX_ACCESSIBLE_PAGES)

	return Math.min(moviePage.totalResults, accessiblePageCount * TMDB_PAGE_SIZE)
}

function selectMovieRank(difficulty: GameDifficulty, movieCount: number): number {
	const { endIndex, startIndex } = getDifficultySlice(difficulty, movieCount)
	const difficultyMovieCount = endIndex - startIndex

	if (difficultyMovieCount < 1) {
		throw new Error('TMDB difficulty range does not contain movies')
	}

	return startIndex + Math.min(difficultyMovieCount - 1, Math.floor(Math.random() * difficultyMovieCount))
}

function getDifficultyCandidates(moviePage: TmdbMoviePage, difficulty: GameDifficulty, movieCount: number): TmdbMovie[] {
	const { endIndex, startIndex } = getDifficultySlice(difficulty, movieCount)
	const pageStartIndex = (moviePage.page - 1) * TMDB_PAGE_SIZE
	const localStartIndex = Math.max(0, startIndex - pageStartIndex)
	const localEndIndex = Math.min(moviePage.movies.length, endIndex - pageStartIndex)

	return rankMoviesByKnownness(moviePage.movies.slice(localStartIndex, localEndIndex))
}

export async function getTmdbCollection(): Promise<MovieCollectionSummary> {
	const firstPage = await getMoviePage('all', 1)

	return {
		description: 'Фильмы TMDB, ранжированные по известности',
		id: TMDB_COLLECTION_ID,
		movieCount: getAccessibleMovieCount(firstPage),
		title: 'Каталог TMDB'
	}
}

export async function getRandomTmdbMovie(
	difficulty: GameDifficulty,
	genre: GameGenre = 'all',
	recognizeImageText: ImageTextRecognizer = import.meta.env.MODE === 'test' ? testImageTextRecognizer : recognizeTmdbImageText
): Promise<CatalogMovie> {
	const firstPage = await getMoviePage(genre, 1)
	const movieCount = getAccessibleMovieCount(firstPage)
	const movieRank = selectMovieRank(difficulty, movieCount)
	const selectedPageNumber = Math.floor(movieRank / TMDB_PAGE_SIZE) + 1
	const selectedPage = selectedPageNumber === 1 ? firstPage : await getMoviePage(genre, selectedPageNumber)
	const difficultyCandidates = getDifficultyCandidates(selectedPage, difficulty, movieCount).filter(
		(candidate) => candidate.backdropPath !== null
	)
	const preferredIndex = Math.floor(Math.random() * difficultyCandidates.length)
	const candidates = orderCandidates(difficultyCandidates, preferredIndex).slice(0, MAX_MOVIE_ATTEMPTS)

	for (const candidate of candidates) {
		const movie = await createCatalogMovie(candidate, recognizeImageText)

		if (movie) {
			return movie
		}
	}

	throw new Error('TMDB difficulty range does not contain a movie with five safe backdrops')
}

export async function searchTmdbCatalog(query: string): Promise<MovieSuggestion[]> {
	const [russianResults, englishResults] = await Promise.all([searchTmdbMovies(query, 'ru-RU'), searchTmdbMovies(query, 'en-US')])
	const russianById = new Map(russianResults.map((movie) => [movie.id, movie]))
	const englishById = new Map(englishResults.map((movie) => [movie.id, movie]))
	const mergedResults = [...russianResults, ...englishResults]
	const suggestions = new Map<number, MovieSuggestion>()

	for (const movie of mergedResults) {
		const localizedMovie = russianById.get(movie.id) ?? movie
		const englishMovie = englishById.get(movie.id) ?? movie
		const releaseYear = getReleaseYear(movie.releaseDate)

		if (releaseYear !== null && !suggestions.has(movie.id)) {
			suggestions.set(movie.id, {
				englishTitle: englishMovie.title,
				id: `tmdb-${movie.id}`,
				releaseYear,
				title: localizedMovie.title
			})
		}

		if (suggestions.size === 10) {
			break
		}
	}

	return [...suggestions.values()]
}
