import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  email: z.string().email(),
});

export const subscribeBackInStock = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("stock_notifications").insert({
      product_id: data.product_id,
      variant_id: data.variant_id ?? null,
      email: data.email,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
