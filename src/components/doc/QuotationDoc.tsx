import { bahtText, computeTotals, formatBaht, lineAmount, lineUnitDiscount, lineUnitPrice } from "@/lib/money";
import { formatThaiDate } from "@/lib/format";
import type { QuotationDoc } from "@/lib/types";

/** rows kept blank below the last item so the table keeps the original shape */
const MIN_ROWS = 14;

export function QuotationDoc({ doc }: { doc: QuotationDoc }) {
  const totals = computeTotals({
    lines: doc.items.map((i) => ({
      qty: i.qty,
      unitPrice: i.unitPrice,
      discount: i.discount ?? 0,
      discountMode: i.discountMode ?? "amount",
    })),
    finalDiscount: doc.finalDiscount ?? 0,
    vatRate: doc.vatRate,
    vatInclusive: doc.vatInclusive,
  });

  const fillerRows = Math.max(0, MIN_ROWS - doc.items.length);

  return (
    <div className="doc">
      {/* ---------- header ---------- */}
      <div className="doc-head">
        {doc.company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="doc-logo-img" src={doc.company.logoUrl} alt="logo" />
        ) : (
          <div className="doc-logo">
            <div className="doc-logo-num">55</div>
            <div className="doc-logo-text">INTER SUPPLY</div>
          </div>
        )}

        <div className="doc-company">
          <div className="doc-company-en">{doc.company.nameEn}</div>
          <div className="doc-company-th">{doc.company.nameTh}</div>
          <div className="doc-company-line">{doc.company.address}</div>
          <div className="doc-company-line">
            โทร. {doc.company.phone} เลขประจำตัวผู้เสียภาษี : {doc.company.taxId}
          </div>
        </div>

        <div className="doc-title">
          <div className="doc-title-th">ใบเสนอราคา</div>
          <div className="doc-title-en">QUOTATION</div>
        </div>
      </div>

      {/* ---------- document info ---------- */}
      <div className="doc-info">
        <div className="doc-info-left">
          <div className="doc-info-top">
            <span>
              <span className="doc-label">เลขประจำตัวผู้เสียภาษี</span>
              <span className="doc-value doc-value-gap">{doc.company.taxId}</span>
            </span>
            <span className="doc-branch">สาขา : {doc.company.branch}</span>
          </div>
          <div className="doc-info-row">
            <span className="doc-label">ลูกค้า / Customer :</span>
            <span className="doc-value">{doc.customer.name}</span>
          </div>
          <div className="doc-info-row">
            <span className="doc-label">ที่อยู่ Address :</span>
            <span className="doc-value">{doc.customer.address}</span>
          </div>
        </div>

        <div className="doc-info-right">
          <div className="doc-info-centered">
            <span className="doc-label-blue">เลขที่เอกสาร</span>
            <span>Ref. No</span>
            <span className="doc-value">{doc.docNo}</span>
          </div>
          <div className="doc-info-centered">
            <span className="doc-label-blue">วันที่</span>
            <span>Date</span>
            <span className="doc-value">{formatThaiDate(doc.docDate)}</span>
          </div>
          <div className="doc-info-centered">
            <span className="doc-label-blue">อ้างถึงใบสั่งซื้อสินค้า</span>
            <span className="doc-value">{doc.poRef ?? "PO"}</span>
          </div>
          <div className="doc-info-centered">
            <span className="doc-label-blue">ผู้จัดทำ :</span>
            <span className="doc-value">{doc.contactName ?? ""}</span>
          </div>
        </div>
      </div>

      {/* ---------- items ---------- */}
      <table className="doc-items">
        <thead>
          <tr>
            <th className="col-no">
              ลำดับ
              <br />
              No.
            </th>
            <th className="col-desc">
              <span className="th-desc">
                รายการ
                <br />
                Description
              </span>
              <span className="th-qty">
                จำนวน
                <br />
                Quantity
              </span>
            </th>
            <th className="col-unit">
              หน่วยละ
              <br />
              Unit
            </th>
            <th className="col-disc">
              ส่วนลด
              <br />
              Discount
            </th>
            <th className="col-uprice">
              ราคาต่อหน่วย
              <br />
              Unit Price
            </th>
            <th className="col-amount">
              จำนวนเงิน
              <br />
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => {
            const line = {
              qty: item.qty,
              unitPrice: item.unitPrice,
              discount: item.discount ?? 0,
              discountMode: item.discountMode ?? "amount",
            };
            const hasDiscount = Boolean(item.discount);
            return (
              <tr key={i}>
                <td className="col-no td-center">{i + 1}</td>
                <td className="col-desc">
                  <span className="td-desc">{item.description}</span>
                  <span className="td-qty">{item.qty}</span>
                </td>
                <td className="col-unit td-right">{formatBaht(item.unitPrice)}</td>
                <td className="col-disc td-right">
                  {hasDiscount ? formatBaht(lineUnitDiscount(line)) : ""}
                </td>
                <td className="col-uprice td-right">
                  {hasDiscount ? formatBaht(lineUnitPrice(line)) : ""}
                </td>
                <td className="col-amount td-right">{formatBaht(lineAmount(line))}</td>
              </tr>
            );
          })}
          {Array.from({ length: fillerRows }).map((_, i) => (
            <tr key={`filler-${i}`}>
              <td className="col-no" />
              <td className="col-desc" />
              <td className="col-unit" />
              <td className="col-disc" />
              <td className="col-uprice" />
              <td className="col-amount" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------- remark + totals ---------- */}
      <div className="doc-bottom">
        <div className="doc-remark">
          <div className="doc-remark-title">หมายเหตุ Remark:</div>
          <div className="doc-remark-row">
            <span>กำหนดยืนราคา / Offer Validity</span>
            <span>: {doc.validityDays} วัน</span>
          </div>
          <div className="doc-remark-row">
            <span>กำหนดส่งของ / Term of Delivery</span>
            <span>: {doc.deliveryDays} วัน</span>
          </div>
          <div className="doc-remark-row">
            <span>กำหนดการชำระเงิน / Term of Payment</span>
            <span>: {doc.paymentDays} วัน</span>
          </div>
          {doc.remark ? <div className="doc-remark-text">{doc.remark}</div> : null}
          <div className="doc-baht">{bahtText(totals.net)}</div>
        </div>

        <div className="doc-summary">
          <div className="doc-summary-row">
            <span className="doc-sum-label">รวม / Total</span>
            <span className="doc-sum-value">{formatBaht(totals.total)}</span>
          </div>
          <div className="doc-summary-row">
            <span className="doc-sum-label">มูลค่าสินค้า / Value Amount</span>
            <span className="doc-sum-value">{formatBaht(totals.valueAmount)}</span>
          </div>
          <div className="doc-summary-row">
            <span className="doc-sum-label">ภาษีมูลค่าเพิ่ม / Vat {doc.vatRate}%</span>
            <span className="doc-sum-value">{formatBaht(totals.vat)}</span>
          </div>
          <div className="doc-summary-row doc-summary-net">
            <span className="doc-sum-label">จำนวนเงินสุทธิ / Net Amount</span>
            <span className="doc-sum-value">{formatBaht(totals.net)}</span>
          </div>
        </div>
      </div>

      {/* ---------- signatures ---------- */}
      <div className="doc-sign">
        <div className="doc-sign-cell">
          <div className="doc-sign-head">ยืนยันการสั่งซื้อสินค้าตามรายการข้างต้น</div>
          <div className="doc-sign-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
          <div className="doc-sign-role">ผู้ซื้อสินค้า</div>
          <div className="doc-sign-date">วันที่ Date ____/____/______</div>
        </div>
        <div className="doc-sign-cell" />
        <div className="doc-sign-cell doc-sign-right">
          {(doc.company.signatureUrl ?? doc.signatureUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="doc-sign-img" src={doc.company.signatureUrl ?? doc.signatureUrl!} alt="ลายเซ็น" />
          ) : null}
          <div className="doc-sign-name">{doc.contactName}</div>
          <div className="doc-sign-role">{doc.contactPosition ?? "ผู้เสนอราคา"}</div>
          <div className="doc-sign-date">วันที่ Date {formatThaiDate(doc.docDate)}</div>
        </div>
      </div>
    </div>
  );
}
