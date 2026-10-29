export function qrImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const base64 = value.replace(/^data:image\/png;base64,/, "");
  if (!base64.startsWith("iVBORw0KGgo") || base64.length > 1000000 || !/^[A-Za-z0-9+/=\r\n]+$/.test(base64)) return null;
  return `data:image/png;base64,${base64}`;
}

export function connectionRoleAllowed(role: string | null | undefined): boolean {
  return role === "owner";
}