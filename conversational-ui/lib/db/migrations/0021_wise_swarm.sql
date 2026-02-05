CREATE TABLE "GatewayApiKey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"gatewayKeyId" uuid NOT NULL,
	"keyPrefix" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "GatewayApiKey" ADD CONSTRAINT "GatewayApiKey_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gateway_api_key_gateway_key_id_unique" ON "GatewayApiKey" USING btree ("gatewayKeyId");--> statement-breakpoint
CREATE INDEX "gateway_api_key_user_idx" ON "GatewayApiKey" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "gateway_api_key_revoked_at_idx" ON "GatewayApiKey" USING btree ("revokedAt");