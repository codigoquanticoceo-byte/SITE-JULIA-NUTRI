create extension if not exists pgcrypto with schema public;

-- Hero content table stores the single hero section copy rendered on the homepage.
create table if not exists public.hero_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  paragraph text,
  bullets text[] not null default array[]::text[],
  updated_at timestamptz not null default timezone('utc', now())
);

-- Ensure at least one record exists when the table is empty.
insert into public.hero_content (title, paragraph, bullets)
select
  'Planilhas e Arquivos Prontos',
  '✔ Manual de Boas Práticas (MBP)\n✔ POPs – Procedimentos Operacionais Padronizados\n✔ Planilhas Profissionais',
  array[
    'Planilhas de controle de estoque',
    'Modelos de relatórios',
    'Fichas técnicas',
    'Checklists de rotina',
    'Documentos administrativos'
  ]
where not exists (select 1 from public.hero_content);

-- Product catalog rendered across the storefront and admin panel.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  image text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

-- Seed initial catalog items if table is empty.
insert into public.products (slug, title, description, price, image, position)
select * from (values
  ('planilha-estoque', 'Artigo de exemplo nutrição', 'Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.', 29.00, '1.webp', 1),
  ('planilha-relatorios', 'Artigo de exemplo nutrição', 'Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.', 25.00, '2.webp', 2),
  ('planilha-fichas', 'Artigo de exemplo nutrição', 'Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.', 25.00, '3.webp', 3),
  ('planilha-checklists', 'Artigo de exemplo nutrição', 'Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.', 20.00, '4.png', 4)
) as seed(slug, title, description, price, image, position)
where not exists (select 1 from public.products);

-- Enable Row Level Security and policies leveraging JWT claim is_admin.
alter table public.hero_content enable row level security;
alter table public.products enable row level security;

create policy "Hero readable by anyone" on public.hero_content
for select
using (true);

create policy "Hero editable by admins" on public.hero_content
for all
using (coalesce((auth.jwt()->>'is_admin')::boolean, false))
with check (coalesce((auth.jwt()->>'is_admin')::boolean, false));

create policy "Products readable by anyone" on public.products
for select
using (true);

create policy "Products writable by admins" on public.products
for all
using (coalesce((auth.jwt()->>'is_admin')::boolean, false))
with check (coalesce((auth.jwt()->>'is_admin')::boolean, false));
