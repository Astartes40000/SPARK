-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'sme', 'investigator')) default 'investigator',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories table
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Posts table (consultas)
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  image_urls text[] default '{}',
  status text not null check (status in ('open', 'answered', 'closed')) default 'open',
  views integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Replies table (respuestas)
create table if not exists public.replies (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_sme_answer boolean default false,
  parent_id uuid references public.replies(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('reply', 'sme_answer', 'mention')),
  post_id uuid references public.posts(id) on delete cascade,
  reply_id uuid references public.replies(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete cascade,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default categories (ignore if already exist)
insert into public.categories (name, description) values
  ('Safety', 'Safety related questions'),
  ('Regulatory', 'Regulatory and compliance questions'),
  ('Chemistry', 'Chemistry and substances questions'),
  ('Operations', 'Operational procedures questions'),
  ('General', 'General questions')
on conflict (name) do nothing;

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.notifications enable row level security;
alter table public.categories enable row level security;

-- Profiles policies (drop first to avoid duplicates)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Posts policies
drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Authenticated users can create posts" on public.posts;
drop policy if exists "Authors can update own posts" on public.posts;
drop policy if exists "Authors and admins can delete posts" on public.posts;
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Authenticated users can create posts" on public.posts for insert with check (auth.role() = 'authenticated');
create policy "Authors can update own posts" on public.posts for update using (auth.uid() = author_id);
create policy "Authors and admins can delete posts" on public.posts for delete using (
  auth.uid() = author_id or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Replies policies
drop policy if exists "Replies are viewable by everyone" on public.replies;
drop policy if exists "Authenticated users can create replies" on public.replies;
drop policy if exists "Authors can update own replies" on public.replies;
drop policy if exists "Authors and admins can delete replies" on public.replies;
create policy "Replies are viewable by everyone" on public.replies for select using (true);
create policy "Authenticated users can create replies" on public.replies for insert with check (auth.role() = 'authenticated');
create policy "Authors can update own replies" on public.replies for update using (auth.uid() = author_id);
create policy "Authors and admins can delete replies" on public.replies for delete using (
  auth.uid() = author_id or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Notifications policies
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "System can insert notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications" on public.notifications for insert with check (true);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Categories policies
drop policy if exists "Categories are viewable by everyone" on public.categories;
drop policy if exists "Only admins can manage categories" on public.categories;
create policy "Categories are viewable by everyone" on public.categories for select using (true);
create policy "Only admins can manage categories" on public.categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'investigator')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to create notification on new reply
create or replace function public.handle_new_reply()
returns trigger as $$
declare
  post_author_id uuid;
begin
  select author_id into post_author_id from public.posts where id = new.post_id;

  if post_author_id != new.author_id then
    insert into public.notifications (user_id, type, post_id, reply_id, from_user_id)
    values (post_author_id, 'reply', new.post_id, new.id, new.author_id);
  end if;

  if new.is_sme_answer then
    update public.posts set status = 'answered' where id = new.post_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for notifications on new reply
drop trigger if exists on_new_reply on public.replies;
create trigger on_new_reply
  after insert on public.replies
  for each row execute procedure public.handle_new_reply();
