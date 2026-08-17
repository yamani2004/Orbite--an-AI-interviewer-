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
  transcript varchar(12000) not null, duration_seconds integer not null, question_id uuid, answer_kind varchar(30) not null default 'PRIMARY', created_at timestamp with time zone default now()
);
create table if not exists public.interview_reports (
  id uuid primary key, session_id uuid not null, overall_score integer not null, technical_knowledge integer not null,
  problem_solving integer not null, communication integer not null, system_design integer not null, follow_up_handling integer not null,
  strengths varchar(4000) not null, improvements varchar(4000) not null, recommended_practice varchar(4000) not null, communication_coach varchar(4000) not null
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
