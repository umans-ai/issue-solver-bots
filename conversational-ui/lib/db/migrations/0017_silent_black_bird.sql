CREATE TABLE "Pledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"email" varchar(255),
	"plan" varchar(32) NOT NULL,
	"billingCycle" varchar(16) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"stripeCustomerId" varchar(255),
	"paymentMethodId" varchar(255),
	"setupIntentId" varchar(255),
	"checkoutSessionId" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_pledge_checkout_session" ON "Pledge" USING btree ("checkoutSessionId");