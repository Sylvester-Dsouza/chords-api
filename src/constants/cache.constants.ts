/**
 * Cache time-to-live (TTL) values in seconds
 */
export enum CacheTTL {
  SHORT = 60, // 1 minute
  MEDIUM = 300, // 5 minutes
  LONG = 3600, // 1 hour
  VERY_LONG = 86400, // 24 hours
}

/**
 * Cache key prefixes for different types of data
 */
export enum CachePrefix {
  SONG = 'song',
  SONGS = 'songs',
  ARTIST = 'artist',
  ARTISTS = 'artists',
  COLLECTION = 'collection',
  COLLECTIONS = 'collections',
  TAG = 'tag',
  TAGS = 'tags',
  LANGUAGE = 'language',
  LANGUAGES = 'languages',
  SONG_RATINGS = 'song_ratings',
  SONG_RATING_STATS = 'song_rating_stats',
  COMMENTS = 'comments',
  COMMENT_COUNT = 'comment_count',
  LIKED_SONGS = 'liked_songs',
  BANNER = 'banner',
  BANNERS = 'banners',
  VOCAL_CATEGORIES = 'vocal_categories',
  VOCAL_ITEMS = 'vocal_items',
  VOCAL_AUDIO_FILES = 'vocal_audio_files',
}
