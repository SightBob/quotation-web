-- Quotation app: schema + seed + storage bucket
-- Regenerated from drizzle/ (0000..0002) - do not edit by hand, edit the migrations instead.
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Alternatively: npm run db:migrate (applies the same schema + records it in drizzle migrations table).

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

CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"address" text DEFAULT '' NOT NULL,
	"tax_id" text,
	"branch" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "doc_counters" (
	"prefix" text PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"unit" text,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_description_idx" ON "products" USING btree ("description");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_doc_no_uidx" ON "quotations" USING btree ("doc_no");--> statement-breakpoint
CREATE INDEX "quotations_customer_id_idx" ON "quotations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotations_doc_date_idx" ON "quotations" USING btree ("doc_date");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");

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

ALTER TABLE "quotations" ADD COLUMN "internal_note" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "revision_no" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotation_audit_logs" ADD CONSTRAINT "quotation_audit_logs_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_audit_logs_quotation_id_idx" ON "quotation_audit_logs" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotations_parent_id_idx" ON "quotations" USING btree ("parent_id");

ALTER TABLE "quotation_audit_logs" ADD COLUMN "changed_by_email" text;

-- ---------------- seed ----------------
INSERT INTO company_settings (id, name_en, name_th, address, phone, tax_id, branch, logo_path, signature_path, primary_color, doc_no_pattern, validity_days, delivery_days, payment_days, vat_rate, vat_inclusive)
VALUES (1, '55 Inter Supply Co., Ltd.', 'บริษัท ทีทีเอินเตอร์ซัพพลาย จำกัด (สำนักงานใหญ่)', '306 หมู่ 7 อ.เทศบาลเมือง-โคลกกรวด อ.เมือง ชลบุรี 30000', '08-9717-5255', '0105548003655', '(สำนักงานใหญ่)', NULL, NULL, '#8CC63F', 'QT{YY}{MM}-{SEQ}', 50, 50, 60, 7, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (name, name_en, address, tax_id) VALUES
 ('บริษัททศนจันทร์จิลล์สหกรณ์ (ประเทศไทย) จำกัด (มหาชน)', NULL, '94 ม.1 ต.บ้านสวน นายสุดสาภารม์โลหก สามเลิศ อ.บางปะอิน จ.ประจวบคีรีขันธ์ 44160', NULL),
 ('บริษัท สยามแมคคิน จำกัด (มหาชน)', NULL, '99/1 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตคลองเตยเหนือ กรุงเทพมหานคร 10110', '0105551000237'),
 ('บริษัท ชิลลิ่น เมทัล จำกัด', NULL, '1/1 ถนนภูจียา ต.หนองขาม อ.เมือง จ.ชลบุรี 30000', '0105548000888');

INSERT INTO products (description, unit, unit_price) VALUES
 ('Carbide cutting tool shank, 12 mm.', NULL, 69000),
 ('Carbide cutting tool shank, 16 mm.', NULL, 95000),
 ('1.0 mm lathe cutting insert', NULL, 39000),
 ('1.3 mm lathe cutting insert', NULL, 49000),
 ('BT40 Tool Holder', NULL, 350000),
 ('Cable lock', NULL, 185000),
 ('Lathe Insert,W  rainbow', NULL, 155000),
 ('Lathe Insert,2mm', NULL, 92000),
 ('Lathe Insert, HSS 3,4,5,6mm', NULL, 38000),
 ('Lathe Insert, HSS 6mm', NULL, 62000),
 ('Lathe Insert, HSS 8mm', NULL, 62000),
 ('Lathe Insert, HSS 10mm', NULL, 68000),
 ('Drill Bit, 3 mm Diameter', NULL, 14500),
 ('Double Expansion Anchor With Bolt, Size 1/4 inch', NULL, 3000);

-- ---------------- storage bucket for logo / signature ----------------
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
