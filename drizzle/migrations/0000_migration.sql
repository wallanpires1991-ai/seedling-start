
create type public.app_role as enum ('superadmin');
create type public.member_role as enum ('owner','attendant','kitchen','courier');
create type public.order_status as enum ('pending_payment','new','confirmed','preparing','ready','out_for_delivery','delivered','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  cnpj text,
  phone text,
  address text,
  ai_name text not null default 'Chef Ana',
  ai_personality text not null default 'Simpática, objetiva e acolhedora.',
  welcome_message text not null default 'Olá! Bem-vindo(a)! Como posso ajudar no seu pedido hoje?',
  delivery_fee numeric(10,2) not null default 6.00,
  min_order numeric(10,2) not null default 20.00,
  prep_minutes int not null default 30,
  whatsapp_status text not null default 'not_configured',
  automation_active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.establishments to authenticated;
grant all on public.establishments to service_role;

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  user_id uuid not null,
  role member_role not null,
  created_at timestamptz not null default now(),
  unique (establishment_id, user_id)
);
create index on public.memberships(user_id);
grant select on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;

create or replace function public.is_member(_est uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.memberships where establishment_id = _est and user_id = _user) $$;

create or replace function public.has_est_role(_est uuid, _user uuid, _roles member_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.memberships where establishment_id = _est and user_id = _user and role = any(_roles)) $$;

create policy "members see memberships" on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]));

alter table public.establishments enable row level security;
create policy "members read est" on public.establishments for select to authenticated
  using (public.is_member(id, auth.uid()) or public.has_role(auth.uid(),'superadmin'));
create policy "owner updates est" on public.establishments for update to authenticated
  using (public.has_est_role(id, auth.uid(), array['owner']::member_role[]));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.categories(establishment_id);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "members read cat" on public.categories for select to authenticated using (public.is_member(establishment_id, auth.uid()));
create policy "owner write cat" on public.categories for all to authenticated
  using (public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]))
  with check (public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  ingredients text not null default '',
  allergens text not null default '',
  price numeric(10,2) not null check (price >= 0),
  available boolean not null default true,
  prep_minutes int not null default 15,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.products(establishment_id);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "members read prod" on public.products for select to authenticated using (public.is_member(establishment_id, auth.uid()));
create policy "owner write prod" on public.products for all to authenticated
  using (public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]))
  with check (public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]));

create table public.modifiers (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  created_at timestamptz not null default now()
);
create index on public.modifiers(product_id);
grant select, insert, update, delete on public.modifiers to authenticated;
grant all on public.modifiers to service_role;
alter table public.modifiers enable row level security;
create policy "members read mod" on public.modifiers for select to authenticated using (public.is_member(establishment_id, auth.uid()));
create policy "owner write mod" on public.modifiers for all to authenticated
  using (public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]))
  with check (public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  code int not null,
  idempotency_key text unique,
  customer_name text not null default 'Cliente',
  customer_phone text,
  fulfillment text not null default 'delivery' check (fulfillment in ('delivery','pickup')),
  address text,
  status order_status not null default 'new',
  payment_method text not null default 'on_delivery',
  payment_status text not null default 'pending',
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  is_test boolean not null default false,
  source text not null default 'panel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders(establishment_id, created_at desc);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "members read orders" on public.orders for select to authenticated using (public.is_member(establishment_id, auth.uid()));
create policy "staff update orders" on public.orders for update to authenticated
  using (public.has_est_role(establishment_id, auth.uid(), array['owner','attendant','kitchen','courier']::member_role[]));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty int not null check (qty > 0),
  unit_price numeric(10,2) not null,
  modifiers jsonb not null default '[]',
  notes text,
  line_total numeric(10,2) not null
);
create index on public.order_items(order_id);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "members read items" on public.order_items for select to authenticated using (public.is_member(establishment_id, auth.uid()));

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade,
  actor_id uuid,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "owner read audit" on public.audit_logs for select to authenticated
  using (public.has_est_role(establishment_id, auth.uid(), array['owner']::member_role[]) or public.has_role(auth.uid(),'superadmin'));

-- status change audit + updated_at
create or replace function public.orders_touch() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into public.audit_logs(establishment_id, actor_id, action, details)
    values (new.establishment_id, auth.uid(), 'order_status', jsonb_build_object('order', new.code, 'from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger orders_touch before update on public.orders for each row execute function public.orders_touch();

-- profile on signup
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- create establishment + owner membership + demo menu
create or replace function public.create_establishment(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare est uuid; c1 uuid; c2 uuid; c3 uuid; p1 uuid; p2 uuid; p3 uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(trim(_name)) < 2 then raise exception 'nome inválido'; end if;
  insert into establishments(name, created_by) values (trim(_name), auth.uid()) returning id into est;
  insert into memberships(establishment_id, user_id, role) values (est, auth.uid(), 'owner');
  insert into categories(establishment_id, name, position) values (est,'Hambúrgueres',1) returning id into c1;
  insert into categories(establishment_id, name, position) values (est,'Acompanhamentos',2) returning id into c2;
  insert into categories(establishment_id, name, position) values (est,'Bebidas',3) returning id into c3;
  insert into products(establishment_id, category_id, name, description, ingredients, allergens, price, prep_minutes, is_demo) values
    (est,c1,'X-Burger Clássico','Hambúrguer artesanal 160g no pão brioche.','Pão brioche, blend bovino 160g, queijo prato, alface, tomate, molho da casa','Glúten, lactose',29.90,15,true) returning id into p1;
  insert into products(establishment_id, category_id, name, description, ingredients, allergens, price, prep_minutes, is_demo) values
    (est,c1,'Smash Duplo','Dois smash burgers com cheddar derretido.','Pão de batata, 2 smash 90g, cheddar, cebola caramelizada, picles','Glúten, lactose',34.90,15,true) returning id into p2;
  insert into products(establishment_id, category_id, name, description, ingredients, allergens, price, prep_minutes, is_demo) values
    (est,c1,'Veggie da Horta','Hambúrguer de grão-de-bico.','Pão integral, burger de grão-de-bico, rúcula, tomate seco, maionese verde','Glúten',31.90,15,true) returning id into p3;
  insert into products(establishment_id, category_id, name, description, ingredients, allergens, price, prep_minutes, is_demo) values
    (est,c2,'Batata Frita','Porção 300g crocante.','Batata, sal','',16.90,10,true),
    (est,c2,'Onion Rings','Anéis de cebola empanados, 10 unidades.','Cebola, farinha de trigo','Glúten',19.90,10,true),
    (est,c3,'Refrigerante Lata','350ml — Coca-Cola, Guaraná ou Sprite.','','',6.50,1,true),
    (est,c3,'Suco Natural','500ml — laranja ou limão.','Fruta, água, açúcar opcional','',9.90,5,true);
  insert into modifiers(establishment_id, product_id, name, price) values
    (est,p1,'Bacon extra',5.00),(est,p1,'Ovo',3.00),(est,p1,'Cheddar extra',4.00),
    (est,p2,'Bacon extra',5.00),(est,p2,'Cheddar extra',4.00),
    (est,p3,'Queijo coalho',4.50);
  insert into audit_logs(establishment_id, actor_id, action) values (est, auth.uid(), 'establishment_created');
  return est;
end $$;
grant execute on function public.create_establishment(text) to authenticated;

-- server-side priced order creation with idempotency
create or replace function public.place_order(
  _est uuid, _items jsonb, _customer_name text, _customer_phone text,
  _fulfillment text, _address text, _payment_method text, _is_test boolean,
  _idempotency_key text, _source text default 'panel', _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid; it jsonb; prod record; mods jsonb; mod_total numeric; unit numeric; sub numeric := 0; fee numeric := 0; next_code int; est record; q int;
begin
  if not public.has_est_role(_est, auth.uid(), array['owner','attendant']::member_role[]) then raise exception 'sem permissão'; end if;
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
end $$;
grant execute on function public.place_order(uuid,jsonb,text,text,text,text,text,boolean,text,text,text) to authenticated;

alter publication supabase_realtime add table public.orders;
