CREATE TABLE "FeaturedRepo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"kbId" text NOT NULL,
	"commitSha" text NOT NULL,
	"repoUrl" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"stars" integer,
	"description" text,
	"language" text,
	"indexedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_owner_name" ON "FeaturedRepo" USING btree ("owner","name");--> statement-breakpoint
CREATE INDEX "featured_repo_active_idx" ON "FeaturedRepo" USING btree ("isActive");