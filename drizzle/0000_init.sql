CREATE TABLE "company_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name_en" text NOT NULL,
	"name_th" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"tax_id" text DEFAULT '' NOT NULL,
	"branch" text DEFAULT '' NOT NULL,
	"logo_path" text,
	"signature_path" text,
	"primary_color" text DEFAULT '#8CC63F' NOT NULL,
	"doc_no_pattern" text DEFAULT 'QT{YY}{MM}-{SEQ}' NOT NULL,
	"validity_days" integer DEFAULT 50 NOT NULL,
	"delivery_days" integer DEFAULT 50 NOT NULL,
	"payment_days" integer DEFAULT 60 NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT 7 NOT NULL,
	"vat_inclusive" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"address" text DEFAULT '' NOT NULL,
	"tax_id" text,
	"branch" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_counters" (
	"prefix" text PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"unit" text,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"description" text NOT NULL,
	"qty" numeric(12, 3) DEFAULT 1 NOT NULL,
	"unit" text,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"discount_mode" text DEFAULT 'amount' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_no" text NOT NULL,
	"doc_date" date NOT NULL,
	"customer_id" integer,
	"customer_name" text NOT NULL,
	"customer_address" text DEFAULT '' NOT NULL,
	"customer_tax_id" text,
	"po_ref" text,
	"contact_name" text,
	"contact_position" text,
	"validity_days" integer DEFAULT 50 NOT NULL,
	"delivery_days" integer DEFAULT 50 NOT NULL,
	"payment_days" integer DEFAULT 60 NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT 7 NOT NULL,
	"vat_inclusive" boolean DEFAULT false NOT NULL,
	"final_discount" integer DEFAULT 0 NOT NULL,
	"remark" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_description_idx" ON "products" USING btree ("description");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_doc_no_uidx" ON "quotations" USING btree ("doc_no");--> statement-breakpoint
CREATE INDEX "quotations_customer_id_idx" ON "quotations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotations_doc_date_idx" ON "quotations" USING btree ("doc_date");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");