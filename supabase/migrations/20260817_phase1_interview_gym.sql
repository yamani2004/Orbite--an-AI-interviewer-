-- Additive Phase 1 migration. Run after schema.sql; no existing tables are dropped.
alter table public.questions add column if not exists category text not null default 'Computer Fundamentals';
alter table public.questions add column if not exists topic text not null default 'General';
alter table public.questions add column if not exists expected_answer_seconds integer not null default 90;
alter table public.questions add column if not exists explanation text;
alter table public.questions add column if not exists example_answer text;
alter table public.questions add column if not exists common_mistakes text;
alter table public.interview_sessions add column if not exists experience_level text;
alter table public.interview_sessions add column if not exists target_role text;
alter table public.interview_sessions add column if not exists interview_type text;
alter table public.interview_sessions add column if not exists duration_minutes integer;
alter table public.session_answers add column if not exists question_id uuid references public.questions(id) on delete set null;
alter table public.session_answers add column if not exists answer_kind text not null default 'PRIMARY';
create table if not exists public.question_follow_ups (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id) on delete cascade,
  step_order integer not null check (step_order between 1 and 3), stage text not null check (stage in ('FOLLOW_UP', 'CHALLENGE', 'TRADE_OFF')),
  prompt text not null check (char_length(prompt) between 10 and 1000), unique(question_id, step_order)
);
create table if not exists public.interview_reports (
  id uuid primary key default gen_random_uuid(), session_id uuid not null unique references public.interview_sessions(id) on delete cascade,
  overall_score smallint not null check (overall_score between 0 and 100), technical_knowledge smallint not null check (technical_knowledge between 0 and 100),
  problem_solving smallint not null check (problem_solving between 0 and 100), communication smallint not null check (communication between 0 and 100),
  system_design smallint not null check (system_design between 0 and 100), follow_up_handling smallint not null check (follow_up_handling between 0 and 100),
  strengths text not null, improvements text not null, recommended_practice text not null, communication_coach text not null, created_at timestamptz not null default now()
);
create index if not exists questions_filters_idx on public.questions(category, topic, difficulty) where active = true;
create index if not exists followups_question_idx on public.question_follow_ups(question_id, step_order);
alter table public.question_follow_ups enable row level security;
alter table public.interview_reports enable row level security;
create policy "followups readable for active questions" on public.question_follow_ups for select using (exists (select 1 from public.questions q where q.id = question_id and q.active = true));
create policy "report owner" on public.interview_reports for select using (exists (select 1 from public.interview_sessions s where s.id = session_id and s.user_id = auth.uid()));
