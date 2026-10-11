export interface MovieKnownnessMetrics {
	popularity: number
	voteCount: number
}

const POPULARITY_WEIGHT = 0.3
const VOTE_COUNT_WEIGHT = 0.7

function normalizeLogarithmicValues(values: readonly number[]): number[] {
	const logarithmicValues = values.map((value) => Math.log1p(Math.max(0, value)))
	const minimum = Math.min(...logarithmicValues)
	const maximum = Math.max(...logarithmicValues)
	const range = maximum - minimum

	if (range === 0) {
		return logarithmicValues.map(() => 0)
	}

	return logarithmicValues.map((value) => (value - minimum) / range)
}

export function rankMoviesByKnownness<T extends MovieKnownnessMetrics>(movies: readonly T[]): T[] {
	if (movies.length < 2) {
		return [...movies]
	}

	const normalizedPopularity = normalizeLogarithmicValues(movies.map((movie) => movie.popularity))
	const normalizedVoteCounts = normalizeLogarithmicValues(movies.map((movie) => movie.voteCount))

	return movies
		.map((movie, index) => ({
			movie,
			score: (normalizedVoteCounts[index] ?? 0) * VOTE_COUNT_WEIGHT + (normalizedPopularity[index] ?? 0) * POPULARITY_WEIGHT
		}))
		.sort((first, second) => second.score - first.score || second.movie.voteCount - first.movie.voteCount)
		.map(({ movie }) => movie)
}
