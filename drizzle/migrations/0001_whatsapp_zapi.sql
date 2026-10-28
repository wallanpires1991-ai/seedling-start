ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS whatsapp_instance_id text UNIQUE, ADD COLUMN IF NOT EXISTS whatsapp_phone text;

CREATE TABLE public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid,
  message_id text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text
);
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read events" ON public.whatsapp_webhook_events FOR SELECT TO authenticated USING (public.is_member(establishment_id, auth.uid()));

CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  phone text NOT NULL,
  customer_name text,
  session int NOT NULL DEFAULT 1,
  messages jsonb NOT NULL DEFAULT '[]',
  handoff boolean NOT NULL DEFAULT false,
  last_order_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, phone)
);
GRANT SELECT ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read conversations" ON public.whatsapp_conversations FOR SELECT TO authenticated USING (public.is_member(establishment_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.place_order(_est uuid, _items jsonb, _customer_name text, _customer_phone text, _fulfillment text, _address text, _payment_method text, _is_test boolean, _idempotency_key text, _source text DEFAULT 'panel'::text, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare oid uuid; it jsonb; prod record; mods jsonb; mod_total numeric; unit numeric; sub numeric := 0; fee numeric := 0; next_code int; est record; q int;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.has_est_role(_est, auth.uid(), array['owner','attendant']::member_role[]) then raise exception 'sem permissão'; end if;
  if _idempotency_key is not null then
    select id into oid from orders where idempotency_key = _idempotency_key;
    if oid is not null then return oid; end if;
  end if;
  if jsonb_array_length(coalesce(_items,'[]')) = 0 then raise exception 'carrinho vazio'; end if;
  if _fulfillment not in ('delivery','pickup') then raise exception 'modalidade inválida'; end if;
  select * into est from establishments where id = _est;
  select coalesce(max(code),1000)+1 into next_code from orders where establishment_id = _est;
  insert into orders(establishment_id, code, idempotency_key, customer_name, customer_phone, fulfillment, address, payment_method, is_test, source, notes,
    status, payment_status)
  values (_est, next_code, _idempotency_key, coalesce(nullif(trim(_customer_name),''),'Cliente'), _customer_phone, _fulfillment, _address, coalesce(_payment_method,'on_delivery'), coalesce(_is_test,false), coalesce(_source,'panel'), _notes,
    case when _payment_method in ('pix','card_link') then 'pending_payment'::order_status else 'new'::order_status end,
    case when coalesce(_is_test,false) then 'test' else 'pending' end)
  returning id into oid;
  for it in select * from jsonb_array_elements(_items) loop
    select * into prod from products where id = (it->>'product_id')::uuid and establishment_id = _est and available;
    if prod is null then raise exception 'produto indisponível'; end if;
    q := greatest(1, least(50, coalesce((it->>'qty')::int,1)));
    select coalesce(jsonb_agg(jsonb_build_object('name',m.name,'price',m.price)),'[]'), coalesce(sum(m.price),0)
      into mods, mod_total from modifiers m
      where m.product_id = prod.id and m.id in (select (x)::uuid from jsonb_array_elements_text(coalesce(it->'modifier_ids','[]')) x);
    unit := prod.price + mod_total;
    insert into order_items(order_id, establishment_id, product_id, name, qty, unit_price, modifiers, notes, line_total)
    values (oid, _est, prod.id, prod.name, q, unit, mods, left(it->>'notes',300), unit*q);
    sub := sub + unit*q;
  end loop;
  if _fulfillment = 'delivery' then fee := est.delivery_fee; end if;
  update orders set subtotal = sub, delivery_fee = fee, total = sub + fee where id = oid;
  insert into audit_logs(establishment_id, actor_id, action, details) values (_est, auth.uid(), 'order_created', jsonb_build_object('code', next_code, 'test', _is_test));
  return oid;
end $function$;