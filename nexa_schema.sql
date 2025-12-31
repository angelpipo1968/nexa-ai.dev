-- 1. Profiles Table (Extends Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  updated_at timestamp with time zone
);

-- 2. Chats Table (Sessions)
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Messages Table (Content)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats not null,
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Enable RLS (Security)
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- 5. Policies (Access Control)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can view own chats" on chats for select using (auth.uid() = user_id);
create policy "Users can create chats" on chats for insert with check (auth.uid() = user_id);

create policy "Users can view messages of own chats" on messages for select using (
  exists ( select 1 from chats where id = messages.chat_id and user_id = auth.uid() )
);
create policy "Users can insert messages to own chats" on messages for insert with check (
  exists ( select 1 from chats where id = messages.chat_id and user_id = auth.uid() )
);

-- 6. Trigger to create Profile on Signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
