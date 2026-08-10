// TTLs are in milliseconds (cache-manager v6 / Keyv convention).
export const CACHE_TTL = {
    // hot counters — cheap to recompute, so a modest TTL plus explicit
    // invalidation on write is enough to keep them accurate.
    LIKES_COUNT: 60_000,
    FOLLOW_COUNT: 60_000,
    // first feed page only. No write-side invalidation: a new post would need
    // to bust every follower's cached feed (fan-out-on-write), which the task
    // spec calls out as a separate, harder problem. A short TTL bounds the
    // staleness instead.
    FEED_FIRST_PAGE: 30_000,
} as const;

export const cacheKeys = {
    postLikesCount: (postId: string): string => `post:${postId}:likesCount`,
    followerCount: (userId: string): string => `follow:${userId}:followerCount`,
    followingCount: (userId: string): string =>
        `follow:${userId}:followingCount`,
    feedFirstPage: (viewerId: string, limit: number): string =>
        `feed:${viewerId}:first:${limit}`,
};
