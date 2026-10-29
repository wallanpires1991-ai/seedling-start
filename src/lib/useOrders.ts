import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export function useOrders(estId: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["orders", estId],
    refetchInterval: 10000,
    queryFn: async () => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("establishment_id", estId)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`orders-${estId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `establishment_id=eq.${estId}` }, () =>
        qc.invalidateQueries({ queryKey: ["orders", estId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [estId, qc]);
  return q;
}

export async function setOrderStatus(id: string, status: string) {
  const { error } = await supabase.rpc("transition_order", { _id: id, _status: status as Database["public"]["Enums"]["order_status"] });
  if (error) toast.error(error.message);
}
