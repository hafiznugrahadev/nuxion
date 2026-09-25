CREATE TABLE "notifications" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"readAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"publicKey" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text[] DEFAULT '{}'::text[] NOT NULL,
	"deviceType" text,
	"backedUp" boolean DEFAULT false NOT NULL,
	"name" text,
	"lastUsedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"usedAt" timestamp(3),
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"familyId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"revokedAt" timestamp(3),
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"userId" text,
	"roleId" text,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"avatarUrl" text,
	"twoFactorEnabled" boolean DEFAULT false NOT NULL,
	"twoFactorSecret" text,
	"recoveryCodes" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications" ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "passkeys_userId_idx" ON "passkeys" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens" ("tokenHash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens" ("tokenHash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens" ("userId");--> statement-breakpoint
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens" ("familyId");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_key" ON "roles" ("name");--> statement-breakpoint
CREATE INDEX "user_roles_roleId_idx" ON "user_roles" ("roleId");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_roles_id_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE;