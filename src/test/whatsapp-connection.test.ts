import { describe, expect, it } from "vitest";
import { connectionRoleAllowed, qrImage } from "@/lib/whatsapp-connection";

describe("WhatsApp connection safeguards", () => {
  it("only allows the restaurant owner to connect", () => {
    expect(connectionRoleAllowed("owner")).toBe(true);
    for (const role of ["manager", "staff", "admin", null, undefined]) expect(connectionRoleAllowed(role)).toBe(false);
  });
  it("accepts provider PNG base64 and rejects remote or executable QR sources", () => {
    expect(qrImage("iVBORw0KGgoAAA==")).toBe("data:image/png;base64,iVBORw0KGgoAAA==");
    expect(qrImage("data:image/png;base64,iVBORw0KGgoAAA==")).toBe("data:image/png;base64,iVBORw0KGgoAAA==");
    for (const value of [null, "https://example.com/qr", "javascript:alert(1)", "data:image/svg+xml,<svg/>", ""]) expect(qrImage(value)).toBeNull();
  });
});