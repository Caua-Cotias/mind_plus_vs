-- PRELIMINARY REVIEW ONLY: generated from local Prisma schema files.
-- Custom CHECK constraints below are manual because Prisma 7.10.1 cannot express them in schema.prisma.
-- This file is not an official migration and has not been applied to any database.

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "access_level" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "media_asset_kind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "media_asset_processing_status" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "series" (
    "id" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "synopsis" VARCHAR(5000) NOT NULL,
    "description" VARCHAR(5000),
    "ageRating" VARCHAR(32),
    "publicationStatus" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "featuredOrder" INTEGER,
    "posterAssetId" VARCHAR(128),
    "featuredAssetId" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season" (
    "id" VARCHAR(128) NOT NULL,
    "seriesId" VARCHAR(128) NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "title" VARCHAR(160),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode" (
    "id" VARCHAR(128) NOT NULL,
    "seasonId" VARCHAR(128) NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "description" VARCHAR(5000),
    "thumbnailAssetId" VARCHAR(128),
    "videoAssetId" VARCHAR(128),
    "durationSeconds" INTEGER,
    "publicationStatus" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "accessLevel" "access_level" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" VARCHAR(128) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_category" (
    "seriesId" VARCHAR(128) NOT NULL,
    "categoryId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_category_pkey" PRIMARY KEY ("seriesId","categoryId")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" VARCHAR(128) NOT NULL,
    "kind" "media_asset_kind" NOT NULL,
    "storageKey" TEXT,
    "processingStatus" "media_asset_processing_status" NOT NULL DEFAULT 'PENDING',
    "mimeType" VARCHAR(127),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");

-- CreateIndex
CREATE INDEX "series_publicationStatus_publishedAt_id_idx" ON "series"("publicationStatus", "publishedAt" DESC, "id" ASC);

-- CreateIndex
CREATE INDEX "series_publicationStatus_featuredOrder_publishedAt_id_idx" ON "series"("publicationStatus", "featuredOrder" ASC, "publishedAt" DESC, "id" ASC);

-- CreateIndex
CREATE INDEX "series_publicationStatus_title_id_idx" ON "series"("publicationStatus", "title" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "series_posterAssetId_idx" ON "series"("posterAssetId");

-- CreateIndex
CREATE INDEX "series_featuredAssetId_idx" ON "series"("featuredAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "season_seriesId_seasonNumber_key" ON "season"("seriesId", "seasonNumber");

-- CreateIndex
CREATE INDEX "episode_seasonId_publicationStatus_episodeNumber_idx" ON "episode"("seasonId", "publicationStatus", "episodeNumber");

-- CreateIndex
CREATE INDEX "episode_seasonId_publicationStatus_accessLevel_episodeNumbe_idx" ON "episode"("seasonId", "publicationStatus", "accessLevel", "episodeNumber");

-- CreateIndex
CREATE INDEX "episode_thumbnailAssetId_idx" ON "episode"("thumbnailAssetId");

-- CreateIndex
CREATE INDEX "episode_videoAssetId_idx" ON "episode"("videoAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "episode_seasonId_episodeNumber_key" ON "episode"("seasonId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "series_category_categoryId_idx" ON "series_category"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_storageKey_key" ON "media_asset"("storageKey");

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_posterAssetId_fkey" FOREIGN KEY ("posterAssetId") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_featuredAssetId_fkey" FOREIGN KEY ("featuredAssetId") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season" ADD CONSTRAINT "season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_thumbnailAssetId_fkey" FOREIGN KEY ("thumbnailAssetId") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_category" ADD CONSTRAINT "series_category_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_category" ADD CONSTRAINT "series_category_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Custom CHECK constraints (not represented in Prisma schema)
ALTER TABLE "series"
    ADD CONSTRAINT "series_featured_order_nonnegative_check"
    CHECK ("featuredOrder" IS NULL OR "featuredOrder" >= 0);

ALTER TABLE "series"
    ADD CONSTRAINT "series_published_requires_published_at_check"
    CHECK (
        "publicationStatus" <> 'PUBLISHED'::"publication_status"
        OR "publishedAt" IS NOT NULL
    );

ALTER TABLE "season"
    ADD CONSTRAINT "season_season_number_positive_check"
    CHECK ("seasonNumber" > 0);

ALTER TABLE "episode"
    ADD CONSTRAINT "episode_episode_number_positive_check"
    CHECK ("episodeNumber" > 0);

ALTER TABLE "episode"
    ADD CONSTRAINT "episode_duration_seconds_positive_check"
    CHECK ("durationSeconds" IS NULL OR "durationSeconds" > 0);

ALTER TABLE "episode"
    ADD CONSTRAINT "episode_published_requires_published_at_check"
    CHECK (
        "publicationStatus" <> 'PUBLISHED'::"publication_status"
        OR "publishedAt" IS NOT NULL
    );

ALTER TABLE "media_asset"
    ADD CONSTRAINT "media_asset_ready_requires_storage_key_check"
    CHECK (
        "processingStatus" <> 'READY'::"media_asset_processing_status"
        OR NULLIF(BTRIM("storageKey"), '') IS NOT NULL
    );
