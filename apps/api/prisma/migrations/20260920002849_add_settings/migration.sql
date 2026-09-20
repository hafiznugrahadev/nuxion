-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- Default rows ship WITH the migration so every environment (incl. prod's
-- `prisma migrate deploy`) starts with usable branding; idempotent for re-runs.
INSERT INTO "settings" ("key", "value", "createdAt", "updatedAt") VALUES
    ('branding', '{"appName": "Nuxion", "logoUrl": null, "faviconUrl": null}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
