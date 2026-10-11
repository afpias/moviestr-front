import { getDifficultySlice } from '@shared/lib/game-difficulty'
import { getGameGenreOption } from '@shared/lib/game-genres'
import { GAME_FRAME_COUNT } from '@shared/lib/game-rules'
import { rankMoviesByKnownness } from '@shared/lib/movie-knownness'
import type { GameDifficulty, GameGenre, MovieCollectionSummary, MovieSuggestion } from '@shared/types/game'

import type { CatalogMovie } from '../data/catalog'

import {
	assertTmdbConfigured,
	getAlternativeTitles,
	getMovieDetails,
	getMovieImages,
	getPopularMovies,
	searchTmdbMovies,
	type TmdbMovie
} from './client'
import { selectSafeBackdrops, type ImageTextRecognizer } from './frame-selection'
import { recognizeTmdbImageText } from './ocr'

const MAX_MOVIE_ATTEMPTS = 8
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const TOP_MOVIE_COUNT = 250
const TMDB_PAGE_SIZE = 20
const TMDB_POOL_PAGE_COUNT = Math.ceil(TOP_MOVIE_COUNT / TMDB_PAGE_SIZE)
const moviePoolCache = new Map<GameGenre, Promise<TmdbMovie[]>>()

export const TMDB_COLLECTION: MovieCollectionSummary = {
	description: '250 фильмов, ранжированных по известности',
	id: 'top-250',
	movieCount: TOP_MOVIE_COUNT,
	title: '250 известных фильмов'
}

function getReleaseYear(releaseDate: string): number | null {
	const year = Number.parseInt(releaseDate.slice(0, 4), 10)

	return Number.isInteger(year) && year > 1800 ? year : null
}

function createImageUrl(path: string, size: 'w500' | 'w1280'): string {
	return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

function uniqueTitles(titles: readonly string[]): string[] {
	return [...new Set(titles.map((title) => title.trim()).filter((title) => title.length > 0))]
}

async function createCatalogMovie(candidate: TmdbMovie, recognizeImageText: ImageTextRecognizer): Promise<CatalogMovie | null> {
	const [russianMovie, englishMovie, images, alternativeTitles] = await Promise.all([
		getMovieDetails(candidate.id, 'ru-RU'),
		getMovieDetails(candidate.id, 'en-US'),
		getMovieImages(candidate.id),
		getAlternativeTitles(candidate.id)
	])
	const aliases = uniqueTitles([russianMovie.title, englishMovie.title, russianMovie.originalTitle, ...alternativeTitles])
	const backdrops = await selectSafeBackdrops(
		images,
		aliases,
		(filePath) => createImageUrl(filePath, 'w1280'),
		recognizeImageText
	)
	const releaseYear = getReleaseYear(russianMovie.releaseDate || englishMovie.releaseDate)
	const posterPath = russianMovie.posterPath ?? englishMovie.posterPath

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
		originalTitle: russianMovie.originalTitle,
		posterUrl: createImageUrl(posterPath, 'w500'),
		releaseYear,
		title: russianMovie.title
	}
}

function orderCandidates(movies: readonly TmdbMovie[], preferredIndex: number): TmdbMovie[] {
	return [...movies.slice(preferredIndex), ...movies.slice(0, preferredIndex)]
}

async function requestMoviePool(genre: GameGenre): Promise<TmdbMovie[]> {
	const genreId = getGameGenreOption(genre).tmdbId
	const pages = await Promise.all(
		Array.from({ length: TMDB_POOL_PAGE_COUNT }, (_, index) => getPopularMovies(index + 1, genreId))
	)
	const uniqueMovies = new Map<number, TmdbMovie>()

	for (const movie of pages.flat()) {
		if (!uniqueMovies.has(movie.id)) {
			uniqueMovies.set(movie.id, movie)
		}

		if (uniqueMovies.size === TOP_MOVIE_COUNT) {
			break
		}
	}

	return rankMoviesByKnownness([...uniqueMovies.values()])
}

async function getMoviePool(genre: GameGenre): Promise<TmdbMovie[]> {
	if (import.meta.env.MODE === 'test') {
		return requestMoviePool(genre)
	}

	const cachedPool = moviePoolCache.get(genre)

	if (cachedPool) {
		return cachedPool
	}

	const moviePool = requestMoviePool(genre).catch((error: unknown) => {
		moviePoolCache.delete(genre)
		throw error
	})

	moviePoolCache.set(genre, moviePool)

	return moviePool
}

export function getTmdbCollection(): MovieCollectionSummary {
	assertTmdbConfigured()
	return TMDB_COLLECTION
}

export async function getRandomTmdbMovie(
	difficulty: GameDifficulty,
	genre: GameGenre = 'all',
	recognizeImageText: ImageTextRecognizer = recognizeTmdbImageText
): Promise<CatalogMovie> {
	const movies = await getMoviePool(genre)
	const { endIndex, startIndex } = getDifficultySlice(difficulty, movies.length)
	const difficultyPool = movies.slice(startIndex, endIndex)
	const preferredIndex = Math.floor(Math.random() * difficultyPool.length)
	const candidates = orderCandidates(difficultyPool, preferredIndex).slice(0, MAX_MOVIE_ATTEMPTS)

	for (const candidate of candidates) {
		const movie = await createCatalogMovie(candidate, recognizeImageText)

		if (movie) {
			return movie
		}
	}

	throw new Error('TMDB difficulty pool does not contain a movie with five safe backdrops')
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
