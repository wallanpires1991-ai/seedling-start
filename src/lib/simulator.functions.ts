import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAttendant } from "./attendant.server";

const Input = z.object({
  establishmentId: z.string().uuid(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .min(1)
    .max(40),
});

export const simulateChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const r = await runAttendant(context.supabase, data.establishmentId, data.messages);
    if ("error" in r) return { error: r.error };
    const { est: _est, ...rest } = r;
    return rest;
  });
