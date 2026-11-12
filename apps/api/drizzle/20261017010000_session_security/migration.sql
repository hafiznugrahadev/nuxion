ALTER TABLE "users" ADD COLUMN "securityVersion" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DELETE FROM "refresh_tokens";
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "securityVersion" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "purpose" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "assurance" text NOT NULL;
