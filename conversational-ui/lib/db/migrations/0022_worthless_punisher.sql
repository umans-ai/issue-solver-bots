CREATE TABLE "AccountReactivation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"adminUserId" uuid,
	"reason" varchar(64) NOT NULL,
	"description" text,
	"previousStatus" varchar(32) NOT NULL,
	"notificationSent" boolean DEFAULT false NOT NULL,
	"gatewaySynced" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AccountReactivation" ADD CONSTRAINT "AccountReactivation_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AccountReactivation" ADD CONSTRAINT "AccountReactivation_adminUserId_User_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_reactivation_user_idx" ON "AccountReactivation" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "account_reactivation_created_at_idx" ON "AccountReactivation" USING btree ("createdAt");