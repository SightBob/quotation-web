import { describe, expect, it } from "vitest";
import { collectErrors, formSchema, newItem, toDoc, type FormState } from "./form";
import { sampleCompany } from "./sample-data";

function baseState(): FormState {
  return {
    docNo: "QT69011-003",
    docDate: "2026-11-16",
    customerName: "ลูกค้า ทดสอบ",
    customerAddress: "1/1 ถนนทดสอบ",
    customerTaxId: "",
    poRef: "PO-1",
    contactName: "นายทดสอบ",
    contactPosition: "ผู้เสนอราคา",
    validityDays: "50",
    deliveryDays: "50",
    paymentDays: "60",
    vatRate: "7",
    vatInclusive: false,
    finalDiscount: "0",
    remark: "",
    items: [newItem({ description: "รายการทดสอบ", qty: "2", unitPrice: "1000" })],
  };
}

describe("formSchema", () => {
  it("accepts a valid form", () => {
    const result = formSchema.safeParse(baseState());
    expect(result.success).toBe(true);
  });

  it("rejects missing customer / empty items / negative price", () => {
    const state = baseState();
    state.customerName = "";
    state.items = [];
    const result = formSchema.safeParse(state);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = collectErrors(result.error);
      expect(errors.customerName).toBeTruthy();
      expect(errors.items).toBeTruthy();
    }
  });

  it("rejects a line without description or with qty <= 0", () => {
    const state = baseState();
    state.items = [newItem({ description: "", qty: "0", unitPrice: "100" })];
    const result = formSchema.safeParse(state);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = collectErrors(result.error);
      expect(errors["items.0.description"]).toBeTruthy();
      expect(errors["items.0.qty"]).toBeTruthy();
    }
  });
});

describe("toDoc", () => {
  it("converts money strings to satang and keeps discount mode", () => {
    const state = baseState();
    state.items = [
      newItem({ description: "A", qty: "2", unitPrice: "1,000.50", discount: "10", discountMode: "percent" }),
    ];
    state.finalDiscount = "100";
    const doc = toDoc(state, sampleCompany);

    expect(doc.items[0].unitPrice).toBe(100050);
    expect(doc.items[0].discount).toBe(10); // percent mode keeps the raw percent
    expect(doc.items[0].discountMode).toBe("percent");
    expect(doc.finalDiscount).toBe(10000);
    expect(doc.docNo).toBe("QT69011-003");
    expect(doc.vatRate).toBe(7);
  });

  it("converts an amount discount to satang", () => {
    const state = baseState();
    state.items = [
      newItem({ description: "A", qty: "1", unitPrice: "1,000", discount: "25", discountMode: "amount" }),
    ];
    expect(toDoc(state, sampleCompany).items[0].discount).toBe(2500);
  });
});
