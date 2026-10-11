import { getRandomRankForDifficulty } from '@shared/lib/game-difficulty'
import type { GameDifficulty, MovieCollectionSummary, MovieSuggestion } from '@shared/types/game'

import type { CatalogMovie } from '../data/catalog'

import {
	assertTmdbConfigured,
	getAlternativeTitles,
	getMovieDetails,
	getMovieImages,
	getTopRatedMovies,
	searchTmdbMovies,
	type TmdbImage,
	type TmdbMovie
} from './client'

const BACKDROP_CANDIDATE_LIMIT = 18
const GAME_FRAME_COUNT = 6
const MAX_MOVIE_ATTEMPTS = 8
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'
const TOP_MOVIE_COUNT = 250
const TOP_RATED_PAGE_SIZE = 20

export const TMDB_COLLECTION: MovieCollectionSummary = {
	description: '250 лучших фильмов по рейтингу TMDB',
	id: 'top-250',
	movieCount: TOP_MOVIE_COUNT,
	title: 'Топ 250 TMDB'
}

function getReleaseYear(releaseDate: string): number | null {
	const year = Number.parseInt(releaseDate.slice(0, 4), 10)

	return Number.isInteger(year) && year > 1800 ? year : null
}

function createImageUrl(path: string, size: 'w500' | 'w1280'): string {
	return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

function shuffle<T>(values: readonly T[]): T[] {
	const shuffled = [...values]

	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1))
		const currentValue = shuffled[index]
		const swapValue = shuffled[swapIndex]

		if (currentValue !== undefined && swapValue !== undefined) {
			shuffled[index] = swapValue
			shuffled[swapIndex] = currentValue
		}
	}

	return shuffled
}

function selectBackdrops(images: TmdbImage[]): TmdbImage[] {
	return shuffle(
		images
			.filter((image) => image.width >= 780 && image.width > image.height)
			.sort((first, second) => second.voteCount - first.voteCount || second.voteAverage - first.voteAverage)
			.slice(0, BACKDROP_CANDIDATE_LIMIT)
	).slice(0, GAME_FRAME_COUNT)
}

function uniqueTitles(titles: readonly string[]): string[] {
	return [...new Set(titles.map((title) => title.trim()).filter((title) => title.length > 0))]
}

async function createCatalogMovie(candidate: TmdbMovie): Promise<CatalogMovie | null> {
	const [russianMovie, englishMovie, images, alternativeTitles] = await Promise.all([
		getMovieDetails(candidate.id, 'ru-RU'),
		getMovieDetails(candidate.id, 'en-US'),
		getMovieImages(candidate.id),
		getAlternativeTitles(candidate.id)
	])
	const backdrops = selectBackdrops(images)
	const releaseYear = getReleaseYear(russianMovie.releaseDate || englishMovie.releaseDate)
	const posterPath = russianMovie.posterPath ?? englishMovie.posterPath

	if (backdrops.length < GAME_FRAME_COUNT || releaseYear === null || posterPath === null) {
		return null
	}

	return {
		aliases: uniqueTitles([russianMovie.title, englishMovie.title, russianMovie.originalTitle, ...alternativeTitles]),
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

function orderCandidates(movies: TmdbMovie[], preferredIndex: number): TmdbMovie[] {
	return [...movies.slice(preferredIndex), ...movies.slice(0, preferredIndex)]
}

export function getTmdbCollection(): MovieCollectionSummary {
	assertTmdbConfigured()
	return TMDB_COLLECTION
}

export async function getRandomTmdbMovie(difficulty: GameDifficulty): Promise<CatalogMovie> {
	const rank = getRandomRankForDifficulty(difficulty)
	const zeroBasedRank = rank - 1
	const page = Math.floor(zeroBasedRank / TOP_RATED_PAGE_SIZE) + 1
	const pageOffset = zeroBasedRank % TOP_RATED_PAGE_SIZE
	const movies = await getTopRatedMovies(page)
	const remainingMovieCount = TOP_MOVIE_COUNT - (page - 1) * TOP_RATED_PAGE_SIZE
	const candidates = orderCandidates(movies.slice(0, Math.min(remainingMovieCount, TOP_RATED_PAGE_SIZE)), pageOffset).slice(
		0,
		MAX_MOVIE_ATTEMPTS
	)

	for (const candidate of candidates) {
		const movie = await createCatalogMovie(candidate)

		if (movie) {
			return movie
		}
	}

	throw new Error('TMDB top-rated page does not contain a movie with six backdrops')
}

export async function searchTmdbCatalog(query: string): Promise<MovieSuggestion[]> {
	const [russianResults, englishResults] = await Promise.all([searchTmdbMovies(query, 'ru-RU'), searchTmdbMovies(query, 'en-US')])
	const russianById = new Map(russianResults.map((movie) => [movie.id, movie]))
	const mergedResults = [...russianResults, ...englishResults]
	const suggestions = new Map<number, MovieSuggestion>()

	for (const movie of mergedResults) {
		const localizedMovie = russianById.get(movie.id) ?? movie
		const releaseYear = getReleaseYear(movie.releaseDate)

		if (releaseYear !== null && !suggestions.has(movie.id)) {
			suggestions.set(movie.id, {
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
