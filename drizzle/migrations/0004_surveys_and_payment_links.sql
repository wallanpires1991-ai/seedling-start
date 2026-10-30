ALTER TABLE public.establishments ALTER COLUMN ai_name SET DEFAULT 'Rebeca';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_ref text;

CREATE TABLE public.order_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  phone text NOT NULL,
  customer_name text,
  state text NOT NULL DEFAULT 'sent',
  rating int,
  comment text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);
CREATE INDEX ON public.order_surveys(establishment_id, phone, state);
GRANT SELECT ON public.order_surveys TO authenticated;
GRANT ALL ON public.order_surveys TO service_role;
ALTER TABLE public.order_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read surveys" ON public.order_surveys FOR SELECT TO authenticated USING (public.is_member(establishment_id, auth.uid()));