-- Marketing automation cycle: attribution, Meta Ads, WhatsApp templates

ALTER TABLE "Lead" ADD COLUMN "contentItemId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "socialPostId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "metaAdCampaignId" TEXT;

ALTER TABLE "SocialPost" ADD COLUMN "contentItemId" TEXT;

ALTER TABLE "MarketingPlan" ADD COLUMN "horizonDays" INTEGER;

ALTER TABLE "ContentItem" ADD COLUMN "trackingSlug" TEXT;
ALTER TABLE "ContentItem" ADD COLUMN "leadCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContentItem" ADD COLUMN "whatsappTemplateId" TEXT;

CREATE TABLE "MetaAdCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contentItemId" TEXT,
    "metaCampaignId" TEXT,
    "metaAdSetId" TEXT,
    "metaAdId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT 'OUTCOME_LEADS',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dailyBudget" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "externalIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "metaTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'he',
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "components" JSONB,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingAutomationRun" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "marketingPlanId" TEXT,
    "horizonDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialPost_contentItemId_key" ON "SocialPost"("contentItemId");
CREATE UNIQUE INDEX "ContentItem_trackingSlug_key" ON "ContentItem"("trackingSlug");
CREATE UNIQUE INDEX "MetaAdCampaign_contentItemId_key" ON "MetaAdCampaign"("contentItemId");
CREATE UNIQUE INDEX "WhatsAppTemplate_businessId_name_language_key" ON "WhatsAppTemplate"("businessId", "name", "language");

CREATE INDEX "Lead_contentItemId_idx" ON "Lead"("contentItemId");
CREATE INDEX "Lead_socialPostId_idx" ON "Lead"("socialPostId");
CREATE INDEX "Lead_metaAdCampaignId_idx" ON "Lead"("metaAdCampaignId");
CREATE INDEX "SocialPost_scheduledAt_idx" ON "SocialPost"("scheduledAt");
CREATE INDEX "ContentItem_scheduledAt_idx" ON "ContentItem"("scheduledAt");
CREATE INDEX "ContentItem_trackingSlug_idx" ON "ContentItem"("trackingSlug");
CREATE INDEX "MetaAdCampaign_businessId_idx" ON "MetaAdCampaign"("businessId");
CREATE INDEX "MetaAdCampaign_status_idx" ON "MetaAdCampaign"("status");
CREATE INDEX "MetaAdCampaign_metaCampaignId_idx" ON "MetaAdCampaign"("metaCampaignId");
CREATE INDEX "WhatsAppTemplate_businessId_idx" ON "WhatsAppTemplate"("businessId");
CREATE INDEX "WhatsAppTemplate_status_idx" ON "WhatsAppTemplate"("status");
CREATE INDEX "MarketingAutomationRun_businessId_idx" ON "MarketingAutomationRun"("businessId");
CREATE INDEX "MarketingAutomationRun_status_idx" ON "MarketingAutomationRun"("status");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "SocialPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_metaAdCampaignId_fkey" FOREIGN KEY ("metaAdCampaignId") REFERENCES "MetaAdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_whatsappTemplateId_fkey" FOREIGN KEY ("whatsappTemplateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetaAdCampaign" ADD CONSTRAINT "MetaAdCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaAdCampaign" ADD CONSTRAINT "MetaAdCampaign_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingAutomationRun" ADD CONSTRAINT "MarketingAutomationRun_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingAutomationRun" ADD CONSTRAINT "MarketingAutomationRun_marketingPlanId_fkey" FOREIGN KEY ("marketingPlanId") REFERENCES "MarketingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
