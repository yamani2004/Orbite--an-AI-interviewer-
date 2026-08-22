-- Additive performance and practice loop. Existing interview/report APIs remain compatible.
alter table public.questions add column if not exists subtopic text;
alter table public.questions add column if not exists expected_concepts text;
alter table public.questions add column if not exists tags text;
alter table public.questions add column if not exists hints text;
alter table public.questions add column if not exists prerequisite_topics text;
alter table public.questions add column if not exists problem_statement text;
alter table public.questions add column if not exists test_cases text;
alter table public.questions add column if not exists starter_code text;
alter table public.questions add column if not exists solution_code text;
alter table public.session_answers add column if not exists code text;
alter table public.session_answers add column if not exists code_language text;

create table if not exists public.interview_skill_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  report_id uuid not null references public.interview_reports(id) on delete cascade,
  skill_key text not null,
  skill_name text not null,
  score smallint not null check (score between 0 and 100),
  independent_score smallint not null check (independent_score between 0 and 100),
  prompted_score smallint not null check (prompted_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique(session_id, skill_key)
);
create index if not exists interview_skill_scores_session_idx on public.interview_skill_scores(session_id, skill_key);

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  time_seconds integer not null default 0 check (time_seconds >= 0),
  attempts integer not null default 1 check (attempts >= 1),
  hints_used integer not null default 0 check (hints_used >= 0),
  solution_viewed boolean not null default false,
  correct boolean,
  performance_score smallint check (performance_score between 0 and 100),
  confidence smallint check (confidence between 0 and 100),
  mistakes text
);
create index if not exists practice_attempts_user_idx on public.practice_attempts(user_id, completed_at desc);
create table if not exists public.practice_skill_scores (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  skill_key text not null,
  skill_name text not null,
  score smallint not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists practice_skill_scores_user_idx on public.practice_skill_scores(user_id, skill_key, created_at desc);

alter table public.interview_skill_scores enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.practice_skill_scores enable row level security;
create policy "skill scores owner" on public.interview_skill_scores for select using (exists (select 1 from public.interview_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "practice attempts owner" on public.practice_attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "practice skill scores owner" on public.practice_skill_scores for select using (user_id = auth.uid());

insert into public.questions (prompt, track, difficulty, sort_order, active, category, topic, subtopic, expected_answer_seconds, expected_concepts, tags, hints, explanation, common_mistakes)
select v.prompt, 'Computer Fundamentals', v.difficulty, 100 + v.sort_order, true, v.category, v.topic, v.subtopic, v.seconds, v.concepts, v.tags, v.hints, v.explanation, v.mistakes
from (values
 ('Number of Islands','MEDIUM',101,'DSA','Graphs','BFS / DFS',120,'visited state, traversal, grid','graph,bfs,dfs','Mark land as visited when you enter it.','Count connected components by traversing each unvisited land cell.','Forgetting to mark cells before exploring neighbors.'),
 ('Course Schedule','MEDIUM',102,'DSA','Graphs','Topological Sort',120,'directed cycle detection, indegree','graph,topological-sort','Model courses as a directed dependency graph.','Use DFS colors or Kahn''s algorithm to detect cycles.','Reversing the prerequisite edge.'),
 ('Longest Substring Without Repeating Characters','MEDIUM',103,'DSA','Strings','Sliding Window',90,'window invariant, last seen index','strings,sliding-window','Move the left boundary past the repeated character.','Maintain a window with unique characters and maximize its length.','Resetting the entire window instead of moving the left pointer.'),
 ('Design a Rate Limiter','MEDIUM',104,'System Design','Rate Limiting','Distributed Counters',180,'capacity, burst handling, consistency','system-design,redis,api','Clarify whether limits are per user, token, or IP.','Compare token bucket, leaky bucket, and distributed storage trade-offs.','Ignoring clock skew and multi-instance coordination.'),
 ('Design a Notification System','HARD',105,'System Design','Notification System','Queues',180,'fanout, retries, idempotency','system-design,kafka,reliability','Separate request acceptance from delivery.','Use durable queues, provider adapters, retry policy, and delivery status.','Retrying non-idempotent sends without a deduplication key.'),
 ('Explain SQL Query Optimization','MEDIUM',106,'DATABASE','Query Optimization','Execution Plans',120,'indexes, selectivity, explain plans','sql,indexes,performance','Start with the actual query and execution plan.','Use selective indexes, reduce scanned rows, and verify with EXPLAIN.','Adding indexes without considering write cost.'),
 ('Design JWT Authentication','MEDIUM',107,'BACKEND','Authentication','JWT',120,'token expiry, refresh, rotation','backend,jwt,security','Separate access-token lifetime from refresh-token lifetime.','Validate issuer, audience, signature, expiry, and rotate refresh tokens.','Treating an unsigned or unexpired token as automatically trustworthy.'),
 ('Tell me about a conflict you resolved','MEDIUM',108,'BEHAVIORAL','Conflict','Communication',120,'ownership, listening, outcome','behavioral,communication','Use situation, action, result, and reflection.','Describe your personal action and measurable outcome.','Only describing what the team did.')
) v(prompt,difficulty,sort_order,category,topic,subtopic,seconds,concepts,tags,hints,explanation,mistakes)
where not exists (select 1 from public.questions q where q.prompt = v.prompt);

insert into public.questions (prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, problem_statement, test_cases, starter_code, explanation, common_mistakes)
select v.title, 'Computer Fundamentals', v.difficulty, 200 + v.sort_order, true, v.category, v.topic, v.seconds, v.statement, v.tests, v.starter, v.explanation, v.mistakes
from (values
 ('Two Sum','EASY',201,'DSA','Arrays',90,'Return indices of two values that sum to target.','[2,7,11,15], 9 => [0,1]\\n[3,3], 6 => [0,1]','// implement twoSum','Use a hash map of value to index.','Returning values instead of indices.'),
 ('Valid Parentheses','EASY',202,'DSA','Stack',75,'Determine whether brackets are correctly nested.','"()[]{}" => true\\n"([)]" => false','// implement isValid','Push openings and match each closing bracket.','Checking only counts, not ordering.'),
 ('Merge Intervals','MEDIUM',203,'DSA','Intervals',120,'Merge all overlapping intervals.','[[1,3],[2,6],[8,10]] => [[1,6],[8,10]]','// implement merge','Sort by start and extend the current interval.','Failing to sort before merging.'),
 ('Binary Tree Level Order','MEDIUM',204,'DSA','Trees',120,'Return values grouped by tree level.','[3,9,20,null,null,15,7] => [[3],[9,20],[15,7]]','// implement levelOrder','Use a queue and process its current size per level.','Mixing nodes from adjacent levels.'),
 ('Validate Binary Search Tree','MEDIUM',205,'DSA','BST',120,'Check whether a binary tree satisfies strict BST ordering.','[2,1,3] => true\\n[5,1,4,null,null,3,6] => false','// implement isValidBST','Carry lower and upper bounds through recursion.','Comparing only each node with its children.'),
 ('Kth Largest Element','MEDIUM',206,'DSA','Heap',120,'Return the kth largest value in an unsorted array.','[3,2,1,5,6,4], k=2 => 5','// implement findKthLargest','Maintain a min heap of size k or use selection.','Building a full descending sort without discussing complexity.'),
 ('Word Search','MEDIUM',207,'DSA','Backtracking',150,'Find whether a word can be formed by adjacent unused cells.','board=[[A,B],[C,D]], word=AB => false','// implement exist','Backtrack the visited state after each branch.','Reusing a cell in one path.'),
 ('Course Schedule II','MEDIUM',208,'DSA','Topological Sort',150,'Return a valid course order or an empty result when dependencies cycle.','2, [[1,0]] => [0,1]\\n2, [[1,0],[0,1]] => []','// implement findOrder','Track indegrees and process zero-indegree nodes.','Returning a partial order when a cycle remains.'),
 ('Climbing Stairs','EASY',209,'DSA','Dynamic Programming',75,'Count distinct ways to reach the nth step using one or two steps.','2 => 2\\n5 => 8','// implement climbStairs','The state is the sum of the previous two states.','Using exponential recursion.'),
 ('Coin Change','MEDIUM',210,'DSA','Dynamic Programming',120,'Return the fewest coins needed to make an amount, or -1.','[1,2,5], 11 => 3\\n[2], 3 => -1','// implement coinChange','Build a bottom-up amount table.','Returning a count when the amount is unreachable.'),
 ('Daily Temperatures','MEDIUM',211,'DSA','Monotonic Stack',120,'For each day, find how many days until a warmer temperature.','[73,74,75,71,69,72,76,73] => [1,1,4,2,1,1,0,0]','// implement dailyTemperatures','Keep unresolved indices in a decreasing stack.','Scanning forward from every day with O(n^2).'),
 ('Number of Connected Components','MEDIUM',212,'DSA','Union Find',120,'Count connected components in an undirected graph.','n=5, edges=[[0,1],[1,2],[3,4]] => 2','// implement countComponents','Union endpoints and decrement component count.','Not handling duplicate edges.'),
 ('Product Except Self','MEDIUM',213,'DSA','Prefix Sum',100,'Return products of all values except the current value without division.','[1,2,3,4] => [24,12,8,6]','// implement productExceptSelf','Combine prefix and suffix products in O(1) extra output space.','Using division and mishandling zero.'),
 ('Longest Palindromic Substring','MEDIUM',214,'DSA','Strings',150,'Return the longest palindromic substring.','"babad" => "bab" or "aba"\\n"cbbd" => "bb"','// implement longestPalindrome','Expand around each possible center.','Checking only odd-length palindromes.'),
 ('Find Median From Data Stream','HARD',215,'DSA','Heap',180,'Support adding numbers and reading the median at any time.','add 1, add 2, median => 1.5\\nadd 3, median => 2','// implement MedianFinder','Use a max heap and min heap with balanced sizes.','Allowing heaps to differ by more than one element.')
) v(title,difficulty,sort_order,category,topic,seconds,statement,tests,starter,explanation,mistakes)
where not exists (select 1 from public.questions q where q.prompt = v.title);

insert into public.questions (prompt, track, difficulty, sort_order, active, category, topic, expected_answer_seconds, problem_statement, test_cases, starter_code, explanation, common_mistakes)
select v.title, 'Computer Fundamentals', v.difficulty, 300 + v.sort_order, true, v.category, v.topic, v.seconds, v.statement, v.tests, v.starter, v.explanation, v.mistakes
from (values
 ('Implement an LRU Cache','MEDIUM',301,'BACKEND','Caching',120,'Design a cache with O(1) get and put operations.','put(1,1), put(2,2), get(1) => 1','// implement LRUCache','Combine a hash map with a doubly linked list.','Using only a queue causes O(n) eviction.'),
 ('Design an Idempotent API','MEDIUM',302,'BACKEND','API Design',120,'Design a payment endpoint that safely retries the same request.','same key twice => one charge\\nnew key => new charge','// implement request handling','Store an idempotency key with the result.','Retrying side effects without a deduplication key.'),
 ('SQL Top Customers','EASY',303,'DATABASE','SQL',90,'Return customers whose total completed order value exceeds a threshold.','orders[(1,10),(1,20),(2,5)], threshold=15 => [1]','-- write the query','Use grouping, filtering, and a clear join condition.','Filtering before aggregation with WHERE instead of HAVING.'),
 ('Transaction Isolation Analysis','MEDIUM',304,'DATABASE','Transactions',120,'Choose an isolation level for two concurrent inventory reservations.','two reservations for one stock item => never oversell','-- explain the transaction','Identify the anomaly and enforce an atomic conditional update.','Claiming serializable is always free.'),
 ('Thread-Safe Counter','EASY',305,'OS','Threads',90,'Implement a counter safely incremented by many worker threads.','100 threads x 1000 increments => 100000','// implement synchronized increment','Protect shared state with a mutex or atomic operation.','Assuming increments are indivisible.'),
 ('Process Scheduler','MEDIUM',306,'OS','Processes',120,'Explain and implement round-robin scheduling for ready processes.','burst=[5,3], quantum=2 => completion order based on rotation','// implement scheduler','Use a queue and re-enqueue unfinished processes.','Starving later processes or losing remaining burst time.'),
 ('Library Management Design','EASY',307,'OOP','Object Design',120,'Model books, members, loans, and overdue rules with maintainable classes.','borrow available => success\\nborrow checked-out => failure','// define classes','Keep responsibilities cohesive and expose meaningful interfaces.','Creating one god class with all behavior.'),
 ('Notification Strategy','MEDIUM',308,'OOP','Design Patterns',120,'Design notifications for email, SMS, and push without changing the sender.','send email, send SMS, send push => separate adapters','// define notification strategies','Use a strategy or adapter boundary for delivery channels.','Hard-coding every channel in one conditional.')
) v(title,difficulty,sort_order,category,topic,seconds,statement,tests,starter,explanation,mistakes)
where not exists (select 1 from public.questions q where q.prompt = v.title);
