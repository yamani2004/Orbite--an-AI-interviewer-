-- Run in the Supabase SQL editor. Never place a service-role key in the React app.
create extension if not exists "pgcrypto";

create type public.session_status as enum ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
create type public.room_status as enum ('WAITING', 'ACTIVE', 'ENDED', 'CLOSED');
create type public.room_role as enum ('HOST', 'GUEST');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null check (char_length(prompt) between 10 and 1000),
  track text not null check (track in ('Computer Fundamentals', 'System Design')),
  difficulty text not null default 'WARM_UP',
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  track text not null check (track in ('Computer Fundamentals', 'System Design')),
  difficulty text not null,
  status public.session_status not null default 'IN_PROGRESS',
  consent_confirmed_at timestamptz not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  question_prompt text not null,
  transcript text not null check (char_length(transcript) <= 12000),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);
create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references auth.users(id) on delete set null,
  topic text not null check (topic in ('Computer Fundamentals', 'System Design')),
  join_code text not null unique check (char_length(join_code) = 6),
  status public.room_status not null default 'WAITING',
  consent_required boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create table public.room_participants (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.room_role not null,
  consented_at timestamptz not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id)
);
create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.live_rooms(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('HARASSMENT', 'DISCRIMINATION', 'SAFETY', 'RECORDING', 'OTHER')),
  details text not null check (char_length(details) between 10 and 3000),
  status text not null default 'OPEN' check (status in ('OPEN', 'REVIEWING', 'RESOLVED')),
  created_at timestamptz not null default now()
);
create index sessions_user_started_idx on public.interview_sessions(user_id, started_at desc);
create index answers_session_idx on public.session_answers(session_id);
create index rooms_status_idx on public.live_rooms(status, created_at desc);

-- Public question bank is readable; all personal data is private to the participant.
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.session_answers enable row level security;
alter table public.live_rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.safety_reports enable row level security;
create policy "questions readable" on public.questions for select using (active = true);
create policy "profile owner" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "session owner" on public.interview_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "answer owner" on public.session_answers for all using (exists (select 1 from public.interview_sessions s where s.id = session_id and s.user_id = auth.uid())) with check (exists (select 1 from public.interview_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "participants see their rooms" on public.live_rooms for select using (host_id = auth.uid() or exists (select 1 from public.room_participants p where p.room_id = id and p.user_id = auth.uid()));
create policy "host creates rooms" on public.live_rooms for insert with check (auth.uid() = host_id);
create policy "participants manage own membership" on public.room_participants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reporter creates and sees reports" on public.safety_reports for select using (reporter_id = auth.uid());
create policy "reporter submits reports" on public.safety_reports for insert with check (reporter_id = auth.uid());

insert into public.questions (prompt, track, difficulty, sort_order) values
('In your own words, what happens from the moment you type a URL into a browser until a web page appears?', 'Computer Fundamentals', 'WARM_UP', 1),
('What is the difference between a process and a thread? When might you prefer each?', 'Computer Fundamentals', 'WARM_UP', 2),
('How does virtual memory help an operating system manage applications?', 'Computer Fundamentals', 'WARM_UP', 3),
('Imagine an application feels slow. What layers would you investigate first?', 'Computer Fundamentals', 'WARM_UP', 4),
('What is a database index, and what trade-off does it introduce?', 'Computer Fundamentals', 'WARM_UP', 5),
('Let’s design a URL shortener. What would you clarify before proposing an architecture?', 'System Design', 'WARM_UP', 1),
('How would you make a high-traffic feed reliable when one service becomes unavailable?', 'System Design', 'WARM_UP', 2),
('Where would you introduce caching in an image-sharing application, and why?', 'System Design', 'WARM_UP', 3),
('How would you approach rate limiting for a public API?', 'System Design', 'WARM_UP', 4),
('What signals would tell you the system needs to scale, and how would you respond?', 'System Design', 'WARM_UP', 5);
