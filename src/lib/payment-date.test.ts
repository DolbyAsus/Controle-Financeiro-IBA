import { describe, expect, it } from "vitest";

import { isPaymentDateAllowed, paymentDateWindow } from "./payment-date";

describe("paymentDateWindow", () => {
  const now = new Date("2026-10-08T01:30:00.000Z");

  it("calcula a data corrente no fuso de São Paulo", () => {
    expect(paymentDateWindow(now)).toEqual({
      minimum: "2025-01-01",
      maximum: "2026-10-07",
    });
  });

  it("rejeita datas futuras e anteriores à janela", () => {
    expect(isPaymentDateAllowed("2026-10-07", now)).toBe(true);
    expect(isPaymentDateAllowed("2026-10-08", now)).toBe(false);
    expect(isPaymentDateAllowed("2024-12-31", now)).toBe(false);
  });
});
