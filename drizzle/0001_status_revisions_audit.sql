CREATE TABLE "quotation_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" uuid NOT NULL,
	"action" text NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "internal_note" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "revision_no" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotation_audit_logs" ADD CONSTRAINT "quotation_audit_logs_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_audit_logs_quotation_id_idx" ON "quotation_audit_logs" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotations_parent_id_idx" ON "quotations" USING btree ("parent_id");