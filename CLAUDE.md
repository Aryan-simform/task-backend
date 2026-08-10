# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

This is a self-guided learning project: an Instagram-style social media backend built with NestJS to deeply
understand the framework (see `nestjs-social-media-task.txt` for the full feature/learning checklist this repo is
working through — posts, likes, comments, privacy, follows, media upload pipeline, soft deletes, caching,
versioning, Swagger). When implementing a new feature, check that file for the intended scope and the
"why" behind design choices (e.g. why cursor pagination over offset, why unique DB constraints over app-level
checks).

## Commands

```bash
npm run start:dev        # run with hot reload
npm run build            # nest build
npm run lint             # eslint --fix on src/apps/libs/test
npm run format            # prettier --write on src/test

npm test                              # unit tests (jest, rootDir: src, pattern *.spec.ts)
npm test -- post.service.spec.ts      # single test file
npm test -- -t "name of test case"    # single test case by name
npm run test:watch
npm run test:cov
npm run test:e2e         # e2e tests, config in test/jest-e2e.json

# TypeORM migrations (data source: src/database/data-source.ts)
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
npm run seed              # ts-node src/database/seeds/seed.ts
```

Husky runs `lint-staged` on commit (eslint --fix + prettier for staged `.ts`; prettier for `.json`/`.md`).

Env vars are documented in `.env-example` (Postgres, JWT access/refresh secrets, Cloudinary, Redis). A local
`.env` already exists and is gitignored — check it for actual dev values instead of asking the user.

## Architecture

**Module layout**: one NestJS module per domain under `src/modules/` (`auth`, `user`, `post`, `comment`, `follow`,
`cloudinary`, `media-queue`, `webhooks`). Each follows: `entities/` (TypeORM), `dto/` (class-validator), a
`*.repository.ts` wrapping the TypeORM `Repository`/query builder, and a `*.service.ts` containing business logic
that controllers call into. Controllers never touch repositories directly.

**Global request pipeline** (registered in `app.module.ts`, applies to every route unless opted out):

- `JwtAuthGuard` (APP_GUARD) — authenticates every route by default. Use `@Public()`
  (`common/decorators/public.decorator.ts`) to exempt a route (e.g. login, register, the Cloudinary webhook).
- `HttpExceptionFilter` (APP_FILTER) — normalizes error responses.
- `ClassSerializerInterceptor` then `TransformInterceptor` (APP_INTERCEPTOR, in that order) — serializer strips
  `@Exclude()`-decorated fields (e.g. password hashes) _before_ the response gets wrapped into the standard
  envelope shape. Order matters if you add more global interceptors.
- `LoggerMiddleware` applied to `'*'` in `AppModule.configure`.

**Privacy enforcement**: private accounts are gated by `PrivacyGuard` + `@checkPrivacy()`
(`common/guards/privacy.guard.ts`, `common/decorators/check-privacy.decorator.ts`), not ad-hoc controller checks.
The guard reads `request.params.userId`, looks up the target user, and allows access if the account is public,
the requester owns it, or `FollowService.isAcceptedFollower()` returns true. Apply `@checkPrivacy()` to any new
route that exposes another user's content.

**Auth**: JWT access + refresh token pair (`AuthService`). Refresh tokens are stored hashed (argon2) in
`RefreshTokenRepository` with rotation-on-use — reusing an already-rotated refresh token revokes _all_ sessions
for that user (theft-detection heuristic). Passwords are hashed with argon2, not bcrypt (bcrypt is only a
leftover dependency). Access/refresh secrets and expirations come from `config/jwt.config.ts`.

**Soft deletes**: two different patterns coexist intentionally — `Post` uses TypeORM's `@DeleteDateColumn` +
`repo.softDelete()/restore()`, so deleted posts still satisfy FK constraints for their comments (see
`PostRepository.findByIdIncludingDeleted`, used by `PostService.restore`). `Comment` uses a plain nullable
`deletedAt` column managed manually — check which pattern an entity uses before adding delete logic to it, they
are not interchangeable.

**Likes / counters**: like counts are denormalized columns (`Post.likesCount`, `Comment.likesCount`) updated
via `manager.increment/decrement` inside a `DatabaseService.transaction()`, with a DB unique constraint on
`(userId, postId)` in `PostLike`/`CommentLike` for idempotency — unique-violation on insert is treated as "already
liked" (not an error), see `getPgErrorCode` / `postgres-error.util.ts` for translating Postgres error codes into
domain exceptions (`PG_UNIQUE_VIOLATION`, `PG_FOREIGN_KEY_VIOLATION`).

**Cursor pagination**: feeds/followers/following use opaque base64 cursors encoding `(createdAt, id)`, compared
with a tuple `WHERE (createdAt, id) < (:createdAt, :id)` — not offset-based. `PostService`/`FollowService` each
have their own `encodeCursor`/`decodeCursor`; see `FeedQueryDto` for the `limit`/`cursor` query shape shared
across these endpoints.

**Media upload pipeline** (Cloudinary + BullMQ, direct-to-storage upload, mirrors Instagram/S3 pattern):

1. Client calls `PostService.requestMediaUpload` → creates a `PostMedia` row (`status: UPLOADING`) and returns
   Cloudinary signed-upload params from `CloudinaryService.generateSignedUploadParams` (public_id = the media
   row's own UUID, under `posts/{postId}/{mediaId}`).
2. Client uploads directly to Cloudinary (server never sees the file bytes).
3. Cloudinary calls back to `WebhooksController.handleCloudinaryWebhook` (`@Public()`), which verifies the
   HMAC signature (`CloudinaryService.verifyWebhookSignature`, requires `rawBody: true` in `NestFactory.create`)
   and enqueues a job on the `media-processing` BullMQ queue (`MEDIA_QUEUE` constant). Job name is inferred from
   the `public_id` prefix (`avatars/` vs. post media).
4. `MediaProcessor` (BullMQ worker) marks the `PostMedia` row `READY`, then recomputes the parent `Post.status`
   (`READY` once all media ready, `FAILED` if any media failed) — this is the `uploading → processing → ready/failed`
   lifecycle from the spec.
5. Responsive variants (`MediaVariants`: thumbnail/medium/full) are _not_ stored — they're derived on read via
   Cloudinary URL transformation strings in `CloudinaryService.getImageVariants` / `getVideoPosterVariants`
   (`PostService.findByIdWithVariants`). Video "variants" are currently poster-frame images only, not transcoded
   renditions — see the comment in `post.service.ts` for why.

Avatar upload reuses the same signed-upload + webhook + queue path (`media.processor.ts` branches on job name),
just keyed under `avatars/{userId}` instead of `posts/{postId}/{mediaId}`.

**Config**: all config is namespaced via `@nestjs/config` factory files in `src/config/*.config.ts`
(`database`, `jwt`, `redis`, `cloudinary`), loaded globally in `AppModule` and read elsewhere with
`configService.getOrThrow('namespace.key')` — never `process.env` directly outside the config factories.

**Database**: TypeORM against Postgres, `synchronize` is only enabled outside `production`
(`database.module.ts`) — real schema changes still need a migration in `src/database/migrations/` since
synchronize is disabled once `NODE_ENV=production`. `DatabaseService.transaction()` is the standard way to wrap
multi-step writes (see the like/unlike pattern above).

**Not yet implemented** per the learning spec (`nestjs-social-media-task.txt`): API versioning, Redis-backed
caching/CacheInterceptor, rate limiting, notifications module, hashtag/full-text search, block/mute. Don't assume
these exist elsewhere in the codebase.
