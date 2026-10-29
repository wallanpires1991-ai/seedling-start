ALTER TABLE public.whatsapp_webhook_events ADD COLUMN claim_token uuid;
CREATE OR REPLACE FUNCTION public.claim_zapi_events(_limit integer DEFAULT 3) RETURNS SETOF public.whatsapp_webhook_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.whatsapp_webhook_events; n integer:=0;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'sem permissão'; END IF;
 UPDATE public.whatsapp_webhook_events SET processing_state='awaiting_review',processing_error='Envio de resultado incerto; revisão necessária',lease_until=NULL,claim_token=NULL WHERE processing_state='processing' AND lease_until<now() AND (checkpoint->>'reply_state'='sending' OR checkpoint->>'confirmation_state'='sending');
 FOR e IN SELECT * FROM public.whatsapp_webhook_events WHERE (processing_state='pending' OR (processing_state='processing' AND lease_until<now())) AND next_attempt_at<=now() ORDER BY next_attempt_at,received_at FOR UPDATE SKIP LOCKED LOOP
  IF NOT EXISTS(SELECT 1 FROM public.whatsapp_webhook_events x WHERE x.establishment_id=e.establishment_id AND x.phone=e.phone AND x.id<>e.id AND (x.processing_state='awaiting_review' OR (x.processing_state='processing' AND x.lease_until>now()) OR (x.processing_state='pending' AND x.received_at<e.received_at))) THEN
   UPDATE public.whatsapp_webhook_events SET processing_state='processing',lease_until=now()+interval '10 minutes',claim_token=gen_random_uuid(),attempts=attempts+1 WHERE id=e.id RETURNING * INTO e;
   RETURN NEXT e; n:=n+1; EXIT WHEN n>=greatest(1,least(_limit,3));
  END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.save_zapi_checkpoint(_event uuid,_claim uuid,_checkpoint jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'sem permissão'; END IF;
 UPDATE public.whatsapp_webhook_events SET checkpoint=_checkpoint,lease_until=now()+interval '10 minutes' WHERE id=_event AND claim_token=_claim AND processing_state='processing' AND lease_until>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'reserva expirada'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_zapi_checkpoint(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_zapi_checkpoint(uuid,uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.complete_zapi_event(_event uuid,_conversation uuid,_messages jsonb,_session integer,_order uuid,_handoff boolean,_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'DEPRECATED: use finish_zapi_event with current claim token'; END $$;
CREATE OR REPLACE FUNCTION public.finish_zapi_event(_event uuid,_claim uuid,_conversation uuid,_messages jsonb,_session integer,_order uuid,_handoff boolean,_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.whatsapp_webhook_events;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'sem permissão'; END IF;
 SELECT * INTO e FROM public.whatsapp_webhook_events WHERE id=_event AND claim_token=_claim AND processing_state='processing' AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'reserva expirada'; END IF;
 UPDATE public.whatsapp_conversations SET messages=_messages,session=_session,last_order_id=_order,handoff=handoff OR _handoff,customer_name=coalesce(nullif(_name,''),customer_name),updated_at=now() WHERE id=_conversation AND establishment_id=e.establishment_id AND phone=e.phone;
 IF NOT FOUND THEN RAISE EXCEPTION 'conversa não corresponde ao restaurante'; END IF;
 UPDATE public.whatsapp_webhook_events SET processed_at=now(),processing_state='done',processing_error=NULL,lease_until=NULL,claim_token=NULL WHERE id=_event;
END $$;
REVOKE ALL ON FUNCTION public.finish_zapi_event(uuid,uuid,uuid,jsonb,integer,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_zapi_event(uuid,uuid,uuid,jsonb,integer,uuid,boolean,text) TO service_role;