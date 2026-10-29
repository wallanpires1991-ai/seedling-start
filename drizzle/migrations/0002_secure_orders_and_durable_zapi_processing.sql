ALTER TABLE public.orders ADD COLUMN request_key text;
UPDATE public.orders SET request_key = idempotency_key WHERE idempotency_key IS NOT NULL;
COMMENT ON COLUMN public.orders.idempotency_key IS 'DEPRECATED: replaced by tenant-scoped request_key; retained for historic records';
CREATE UNIQUE INDEX orders_tenant_request_key ON public.orders(establishment_id, request_key) WHERE request_key IS NOT NULL;
REVOKE UPDATE ON public.orders FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.place_order(_est uuid, _items jsonb, _customer_name text, _customer_phone text, _fulfillment text, _address text, _payment_method text, _is_test boolean, _idempotency_key text, _source text DEFAULT 'panel', _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid; it jsonb; prod record; mods jsonb; mod_total numeric; unit numeric; sub numeric := 0; fee numeric := 0; next_code int; est record; q int; ids uuid[]; matched int;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' AND NOT public.has_est_role(_est,auth.uid(),array['owner','attendant']::public.member_role[]) THEN RAISE EXCEPTION 'sem permissão'; END IF;
 IF nullif(trim(_idempotency_key),'') IS NULL OR length(_idempotency_key)>200 THEN RAISE EXCEPTION 'chave do pedido obrigatória'; END IF;
 SELECT * INTO est FROM public.establishments WHERE id=_est FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'estabelecimento não encontrado'; END IF;
 SELECT id INTO oid FROM public.orders WHERE establishment_id=_est AND request_key=_idempotency_key;
 IF oid IS NOT NULL THEN RETURN oid; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items)=0 OR jsonb_array_length(_items)>100 THEN RAISE EXCEPTION 'carrinho inválido'; END IF;
 IF _fulfillment IS NULL OR _fulfillment NOT IN ('delivery','pickup') THEN RAISE EXCEPTION 'modalidade inválida'; END IF;
 IF _fulfillment='delivery' AND nullif(trim(_address),'') IS NULL THEN RAISE EXCEPTION 'endereço obrigatório'; END IF;
 IF nullif(trim(_customer_name),'') IS NULL THEN RAISE EXCEPTION 'nome obrigatório'; END IF;
 IF _payment_method IS NULL OR _payment_method NOT IN ('on_delivery','cash','card_on_delivery','pix','card_link') THEN RAISE EXCEPTION 'forma de pagamento inválida'; END IF;
 IF _source='simulator' AND _is_test IS DISTINCT FROM true THEN RAISE EXCEPTION 'simulador exige pedido de teste'; END IF;
 SELECT coalesce(max(code),1000)+1 INTO next_code FROM public.orders WHERE establishment_id=_est;
 INSERT INTO public.orders(establishment_id,code,request_key,customer_name,customer_phone,fulfillment,address,payment_method,is_test,source,notes,status,payment_status)
 VALUES(_est,next_code,_idempotency_key,left(trim(_customer_name),200),left(_customer_phone,30),_fulfillment,left(_address,1000),_payment_method,coalesce(_is_test,false),coalesce(_source,'panel'),left(_notes,1000),CASE WHEN _payment_method IN ('pix','card_link') THEN 'pending_payment'::public.order_status ELSE 'new'::public.order_status END,CASE WHEN coalesce(_is_test,false) THEN 'test' ELSE 'pending' END) RETURNING id INTO oid;
 FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
  IF jsonb_typeof(it) IS DISTINCT FROM 'object' OR coalesce(it->>'qty','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'quantidade inválida'; END IF;
  q := (it->>'qty')::int;
  IF q<1 OR q>50 THEN RAISE EXCEPTION 'quantidade deve ser de 1 a 50'; END IF;
  SELECT * INTO prod FROM public.products WHERE id=(it->>'product_id')::uuid AND establishment_id=_est AND available;
  IF NOT FOUND THEN RAISE EXCEPTION 'produto indisponível'; END IF;
  IF jsonb_typeof(coalesce(it->'modifier_ids','[]'::jsonb)) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'adicionais inválidos'; END IF;
  SELECT coalesce(array_agg(x::uuid),'{}'::uuid[]) INTO ids FROM jsonb_array_elements_text(coalesce(it->'modifier_ids','[]'::jsonb)) x;
  IF cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) THEN RAISE EXCEPTION 'adicional repetido'; END IF;
  SELECT count(*),coalesce(jsonb_agg(jsonb_build_object('name',m.name,'price',m.price)),'[]'),coalesce(sum(m.price),0) INTO matched,mods,mod_total FROM public.modifiers m WHERE m.establishment_id=_est AND m.product_id=prod.id AND m.id=ANY(ids);
  IF matched<>cardinality(ids) THEN RAISE EXCEPTION 'adicional não pertence ao produto ou restaurante'; END IF;
  IF prod.price<0 OR EXISTS(SELECT 1 FROM public.modifiers WHERE id=ANY(ids) AND price<0) THEN RAISE EXCEPTION 'preço inválido'; END IF;
  unit:=round(prod.price+mod_total,2);
  INSERT INTO public.order_items(order_id,establishment_id,product_id,name,qty,unit_price,modifiers,notes,line_total) VALUES(oid,_est,prod.id,prod.name,q,unit,mods,left(it->>'notes',300),round(unit*q,2));
  sub:=sub+round(unit*q,2);
 END LOOP;
 IF sub<est.min_order THEN RAISE EXCEPTION 'Pedido mínimo: R$ %',est.min_order; END IF;
 IF _fulfillment='delivery' THEN fee:=round(est.delivery_fee,2); END IF;
 IF fee<0 THEN RAISE EXCEPTION 'taxa inválida'; END IF;
 UPDATE public.orders SET subtotal=sub,delivery_fee=fee,total=sub+fee WHERE id=oid;
 INSERT INTO public.audit_logs(establishment_id,actor_id,action,details) VALUES(_est,auth.uid(),'order_created',jsonb_build_object('code',next_code,'test',coalesce(_is_test,false)));
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.place_order(uuid,jsonb,text,text,text,text,text,boolean,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid,jsonb,text,text,text,text,text,boolean,text,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.transition_order(_id uuid,_status public.order_status) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; roles public.member_role[];
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pedido não encontrado'; END IF;
 roles:=CASE WHEN _status IN ('preparing','ready') THEN array['owner','attendant','kitchen']::public.member_role[] WHEN _status IN ('out_for_delivery','delivered') THEN array['owner','attendant','courier']::public.member_role[] ELSE array['owner','attendant']::public.member_role[] END;
 IF NOT public.has_est_role(o.establishment_id,auth.uid(),roles) THEN RAISE EXCEPTION 'sem permissão para esta etapa'; END IF;
 IF o.status=_status THEN RETURN; END IF;
 IF NOT ((_status='cancelled' AND o.status NOT IN ('delivered','cancelled')) OR (o.status='new' AND _status IN ('confirmed','preparing')) OR (o.status='confirmed' AND _status='preparing') OR (o.status='preparing' AND _status='ready') OR (o.status='ready' AND ((o.fulfillment='pickup' AND _status='delivered') OR (o.fulfillment='delivery' AND _status='out_for_delivery'))) OR (o.status='out_for_delivery' AND _status='delivered')) THEN RAISE EXCEPTION 'mudança de etapa inválida'; END IF;
 UPDATE public.orders SET status=_status WHERE id=_id;
 INSERT INTO public.audit_logs(establishment_id,actor_id,action,details) VALUES(o.establishment_id,auth.uid(),'order_status_changed',jsonb_build_object('order_id',_id,'from',o.status,'to',_status));
END $$;
REVOKE ALL ON FUNCTION public.transition_order(uuid,public.order_status) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid,public.order_status) TO authenticated;

ALTER TABLE public.whatsapp_webhook_events ADD COLUMN provider_message_id text, ADD COLUMN phone text, ADD COLUMN processing_state text NOT NULL DEFAULT 'pending', ADD COLUMN lease_until timestamptz, ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN attempts integer NOT NULL DEFAULT 0, ADD COLUMN checkpoint jsonb NOT NULL DEFAULT '{}';
UPDATE public.whatsapp_webhook_events SET provider_message_id=message_id,phone=payload->>'phone',processing_state=CASE WHEN processed_at IS NOT NULL THEN 'done' ELSE 'pending' END;
CREATE INDEX zapi_pending_recovery ON public.whatsapp_webhook_events(next_attempt_at) WHERE processing_state IN ('pending','processing');
CREATE OR REPLACE FUNCTION public.claim_zapi_events(_limit integer DEFAULT 3) RETURNS SETOF public.whatsapp_webhook_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.whatsapp_webhook_events; n integer:=0;
BEGIN
 UPDATE public.whatsapp_webhook_events SET processing_state='awaiting_review',processing_error='Envio de resultado incerto; revisão necessária',lease_until=NULL WHERE processing_state='processing' AND lease_until<now() AND (checkpoint->>'reply_state'='sending' OR checkpoint->>'confirmation_state'='sending');
 FOR e IN SELECT * FROM public.whatsapp_webhook_events WHERE (processing_state='pending' OR (processing_state='processing' AND lease_until<now())) AND next_attempt_at<=now() ORDER BY next_attempt_at,received_at FOR UPDATE SKIP LOCKED LOOP
  IF NOT EXISTS(SELECT 1 FROM public.whatsapp_webhook_events x WHERE x.establishment_id=e.establishment_id AND x.phone=e.phone AND x.id<>e.id AND (x.processing_state='awaiting_review' OR (x.processing_state='processing' AND x.lease_until>now()))) THEN
   UPDATE public.whatsapp_webhook_events SET processing_state='processing',lease_until=now()+interval '10 minutes',attempts=attempts+1 WHERE id=e.id RETURNING * INTO e;
   RETURN NEXT e; n:=n+1;
   EXIT WHEN n>=greatest(1,least(_limit,3));
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.claim_zapi_events(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_zapi_events(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_zapi_event(_event uuid,_conversation uuid,_messages jsonb,_session integer,_order uuid,_handoff boolean,_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.whatsapp_webhook_events;
BEGIN
 SELECT * INTO e FROM public.whatsapp_webhook_events WHERE id=_event FOR UPDATE;
 IF NOT FOUND OR e.processing_state<>'processing' THEN RAISE EXCEPTION 'evento não reservado'; END IF;
 UPDATE public.whatsapp_conversations SET messages=_messages,session=_session,last_order_id=_order,handoff=handoff OR _handoff,customer_name=coalesce(nullif(_name,''),customer_name),updated_at=now() WHERE id=_conversation AND establishment_id=e.establishment_id AND phone=e.phone;
 IF NOT FOUND THEN RAISE EXCEPTION 'conversa não corresponde ao restaurante'; END IF;
 UPDATE public.whatsapp_webhook_events SET processed_at=now(),processing_state='done',processing_error=NULL,lease_until=NULL WHERE id=_event;
END $$;
REVOKE ALL ON FUNCTION public.complete_zapi_event(uuid,uuid,jsonb,integer,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_zapi_event(uuid,uuid,jsonb,integer,uuid,boolean,text) TO service_role;