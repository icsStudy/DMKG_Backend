-- Upgrade roadmap: new models and fields

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "brandColors" JSONB;

ALTER TABLE "SocialPost" ADD COLUMN IF NOT EXISTS "firstComment" TEXT;
ALTER TABLE "SocialPost" ADD COLUMN IF NOT EXISTS "firstCommentPostedAt" TIMESTAMP(3);

ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "evergreenEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "evergreenIntervalDays" INTEGER;
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "maxReposts" INTEGER;
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "repostCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "lastRepostedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CreativeScore" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreativeScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CompetitorInsight" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "competitorUrl" TEXT NOT NULL,
    "platform" TEXT,
    "analysis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SocialMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fromName" TEXT,
    "content" TEXT NOT NULL,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BioLink" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "theme" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BioLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SocialMessage_externalId_key" ON "SocialMessage"("externalId");
CREATE INDEX IF NOT EXISTS "SocialMessage_businessId_platform_idx" ON "SocialMessage"("businessId", "platform");
CREATE INDEX IF NOT EXISTS "CreativeScore_businessId_idx" ON "CreativeScore"("businessId");
CREATE INDEX IF NOT EXISTS "CreativeScore_contentItemId_idx" ON "CreativeScore"("contentItemId");
CREATE INDEX IF NOT EXISTS "CompetitorInsight_businessId_idx" ON "CompetitorInsight"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "BioLink_businessId_key" ON "BioLink"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "BioLink_slug_key" ON "BioLink"("slug");

ALTER TABLE "CreativeScore" ADD CONSTRAINT "CreativeScore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitorInsight" ADD CONSTRAINT "CompetitorInsight_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialMessage" ADD CONSTRAINT "SocialMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BioLink" ADD CONSTRAINT "BioLink_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
