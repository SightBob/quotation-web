-- seed data for the quotation app (run after init_schema)

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
