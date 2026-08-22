create table if not exists public.questions (
  id uuid primary key, prompt varchar(1000) not null, track varchar(100) not null,
  difficulty varchar(50) not null, sort_order smallint not null, active boolean not null,
  category varchar(100) not null, topic varchar(100) not null, expected_answer_seconds integer not null,
  explanation varchar(2000), example_answer varchar(3000), common_mistakes varchar(2000)
);
create table if not exists public.question_follow_ups (
  id uuid primary key, question_id uuid not null, step_order integer not null, stage varchar(30) not null, prompt varchar(1000) not null
);
create table if not exists public.interview_sessions (
  id uuid primary key, user_id uuid, track varchar(100) not null, difficulty varchar(50) not null,
  status varchar(30) not null, consent_confirmed_at timestamp with time zone not null, experience_level varchar(50),
  target_role varchar(100), interview_type varchar(100), duration_minutes integer, completed_at timestamp with time zone
);
create table if not exists public.session_answers (
  id uuid primary key, session_id uuid not null, question_prompt varchar(2000) not null,
  transcript varchar(12000) not null, duration_seconds integer not null, question_id uuid, answer_kind varchar(30) not null default 'PRIMARY', paste_detected boolean not null default false, paste_event_count integer not null default 0, pasted_characters integer not null default 0, created_at timestamp with time zone default now(), code varchar(30000), code_language varchar(50)
);
create table if not exists public.interview_reports (
  id uuid primary key, session_id uuid not null, overall_score integer not null, technical_knowledge integer not null,
  problem_solving integer not null, communication integer not null, system_design integer not null, follow_up_handling integer not null,
  strengths varchar(4000) not null, improvements varchar(4000) not null, recommended_practice varchar(4000) not null, communication_coach varchar(4000) not null
);
create table if not exists public.interview_skill_scores (
  id uuid primary key, session_id uuid not null, report_id uuid not null, skill_key varchar(100) not null,
  skill_name varchar(150) not null, score integer not null, independent_score integer not null,
  prompted_score integer not null, created_at timestamp with time zone default now(), unique(session_id, skill_key)
);
create table if not exists public.practice_attempts (
  id uuid primary key, question_id uuid not null, user_id uuid, started_at timestamp with time zone default now(),
  completed_at timestamp with time zone, time_seconds integer not null default 0, attempts integer not null default 1,
  hints_used integer not null default 0, solution_viewed boolean not null default false, correct boolean,
  performance_score integer, confidence integer, mistakes varchar(4000)
);
create table if not exists public.practice_skill_scores (
  id uuid primary key, attempt_id uuid not null, user_id uuid, skill_key varchar(100) not null,
  skill_name varchar(150) not null, score integer not null, created_at timestamp with time zone default now()
);
create table if not exists public.live_rooms (
  id uuid primary key, host_id uuid, topic varchar(100) not null, join_code varchar(6) not null,
  status varchar(30) not null, consent_required boolean not null
);
create table if not exists public.room_participants (
  room_id uuid not null, user_id uuid not null, role varchar(30) not null, consented_at timestamp with time zone not null
);
create table if not exists public.safety_reports (
  id uuid primary key, reporter_id uuid, room_id uuid, reported_user_id uuid,
  category varchar(50) not null, details varchar(3000) not null
);
insert into public.questions (id, prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, explanation, example_answer, common_mistakes) values
('b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80001', 'Explain database indexing.', 'Computer Fundamentals', 'EASY', 1, true, 'DBMS', 'Indexing', 90, 'An index is a data structure that accelerates lookups by avoiding a full table scan.', 'For example, a B-tree index helps find a user by email without reading every row.', 'Saying indexes are free or forgetting their write cost.'),
('b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80002', 'What is the difference between a process and a thread?', 'Computer Fundamentals', 'MEDIUM', 2, true, 'Operating Systems', 'Processes and Threads', 90, 'Processes have isolated memory; threads share a process memory space.', 'A web server can run separate processes for isolation and threads for lighter concurrent work.', 'Claiming threads have separate process memory.'),
('b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80003', 'Why does HTTP/3 use QUIC?', 'Computer Fundamentals', 'HARD', 3, true, 'Computer Networks', 'HTTP/3', 120, 'QUIC reduces head-of-line blocking and integrates transport security over UDP.', 'Independent streams can progress even when another stream loses a packet.', 'Saying QUIC removes all latency.'),
('b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80004', 'How would you design a URL shortener?', 'System Design', 'MEDIUM', 4, true, 'System Design', 'URL Shortener', 180, 'Clarify scale, latency, durability, and read/write ratio before choosing components.', 'Use an ID generator, durable mapping store, cache, and redirect service.', 'Starting with technology choices before clarifying constraints.'),
('b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80005', 'How would you make a high-traffic feed reliable during a service outage?', 'System Design', 'HARD', 5, true, 'Distributed Systems', 'Resilience', 180, 'Use graceful degradation, timeouts, circuit breakers, queues, and observability.', 'Serve cached feed data while isolating the unhealthy dependency.', 'Retrying synchronously without limits.');
insert into public.question_follow_ups (id, question_id, step_order, stage, prompt) values
('d40c7a1f-2cdb-4ceb-a9a8-9a7f33b80001', 'b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80001', 1, 'FOLLOW_UP', 'Why does an index improve read performance?'),
('d40c7a1f-2cdb-4ceb-a9a8-9a7f33b80002', 'b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80001', 2, 'CHALLENGE', 'What are the disadvantages of using too many indexes?'),
('d40c7a1f-2cdb-4ceb-a9a8-9a7f33b80003', 'b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80001', 3, 'TRADE_OFF', 'When would you avoid using an index?'),
('d40c7a1f-2cdb-4ceb-a9a8-9a7f33b80004', 'b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80004', 1, 'FOLLOW_UP', 'How would you handle ten million requests per second?'),
('d40c7a1f-2cdb-4ceb-a9a8-9a7f33b80005', 'b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80004', 2, 'CHALLENGE', 'What becomes the bottleneck?'),
('d40c7a1f-2cdb-4ceb-a9a8-9a7f33b80006', 'b40c7a1f-2cdb-4ceb-a9a8-9a7f33b80004', 3, 'TRADE_OFF', 'Would you choose SQL or NoSQL here? Why?');

alter table if exists public.questions add column if not exists subtopic varchar(150);
alter table if exists public.questions add column if not exists expected_concepts varchar(2000);
alter table if exists public.questions add column if not exists tags varchar(1000);
alter table if exists public.questions add column if not exists hints varchar(2000);
alter table if exists public.questions add column if not exists prerequisite_topics varchar(1000);
alter table if exists public.questions add column if not exists problem_statement varchar(8000);
alter table if exists public.questions add column if not exists test_cases varchar(8000);
alter table if exists public.questions add column if not exists starter_code varchar(30000);
alter table if exists public.questions add column if not exists solution_code varchar(30000);
alter table if exists public.session_answers add column if not exists code varchar(30000);
alter table if exists public.session_answers add column if not exists code_language varchar(50);
insert into public.questions (id, prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, explanation, common_mistakes)
select random_uuid(), 'Number of Islands', 'Computer Fundamentals', 'MEDIUM', 101, true, 'DSA', 'Graphs', 120, 'Traverse each unvisited land cell to count connected components.', 'Forgetting visited state.'
where not exists (select 1 from public.questions where prompt = 'Number of Islands');
insert into public.questions (id, prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, explanation, common_mistakes)
select random_uuid(), 'Design a Rate Limiter', 'System Design', 'MEDIUM', 102, true, 'System Design', 'Rate Limiting', 180, 'Compare token bucket, leaky bucket, and distributed coordination.', 'Ignoring bursts and multi-instance consistency.'
where not exists (select 1 from public.questions where prompt = 'Design a Rate Limiter');
insert into public.questions (id, prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, explanation, common_mistakes, problem_statement, test_cases, starter_code)
select random_uuid(), 'Thread-Safe Counter', 'Computer Fundamentals', 'EASY', 103, true, 'OS', 'Threads', 90, 'Protect shared state with a mutex or atomic operation.', 'Assuming increments are indivisible.', 'Implement a counter safely incremented by many worker threads.', '100 threads x 1000 increments => 100000', '// implement synchronized increment'
where not exists (select 1 from public.questions where prompt = 'Thread-Safe Counter');
insert into public.questions (id, prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, explanation, common_mistakes, problem_statement, test_cases, starter_code)
select random_uuid(), 'Library Management Design', 'Computer Fundamentals', 'EASY', 104, true, 'OOP', 'Object Design', 120, 'Keep responsibilities cohesive and expose meaningful interfaces.', 'Creating one god class with all behavior.', 'Model books, members, loans, and overdue rules with maintainable classes.', 'borrow available => success; borrow checked-out => failure', '// define classes'
where not exists (select 1 from public.questions where prompt = 'Library Management Design');
insert into public.questions (id, prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, explanation, common_mistakes, problem_statement, test_cases, starter_code)
select random_uuid(), 'SQL Top Customers', 'Computer Fundamentals', 'EASY', 105, true, 'DATABASE', 'SQL', 90, 'Use grouping, filtering, and a clear join condition.', 'Filtering before aggregation with WHERE instead of HAVING.', 'Return customers whose completed order value exceeds a threshold.', 'orders[(1,10),(1,20),(2,5)], threshold=15 => [1]', '-- write the query'
where not exists (select 1 from public.questions where prompt = 'SQL Top Customers');


alter table if exists public.session_answers add column if not exists paste_detected boolean not null default false;
alter table if exists public.session_answers add column if not exists paste_event_count integer not null default 0;
alter table if exists public.session_answers add column if not exists pasted_characters integer not null default 0;
