-- Migration 004: Domain Interview Packs
-- Pre-built question sets for DSA, System Design, and HR interviews (Pro feature)

CREATE TABLE IF NOT EXISTS public.domain_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null, -- 'dsa' | 'system_design' | 'hr'
  description text,
  question_count integer,
  is_active boolean default true
);

CREATE TABLE IF NOT EXISTS public.domain_pack_questions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.domain_packs(id) on delete cascade,
  question_text text not null,
  rubric jsonb,
  category text not null default 'technical',
  difficulty text not null default 'medium'
);

-- No RLS needed — these are public catalogue data
-- Grant read-only access to all authenticated roles
grant select on public.domain_packs to anon, authenticated;
grant select on public.domain_pack_questions to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: Pack definitions
-- ────────────────────────────────────────────────────────────────────────────

DO $seed$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.domain_packs
    WHERE id = '10000000-0000-0000-0000-000000000001'::uuid
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.domain_packs (id, name, domain, description, question_count) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Data Structures & Algorithms',
    'dsa',
    'Core DSA questions covering arrays, trees, graphs, dynamic programming, and complexity analysis. Essential for product and service companies.',
    15
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'System Design',
    'system_design',
    'System design questions covering scalability, distributed systems, databases, and architecture patterns. Targeted at senior/SDE-2+ rounds.',
    15
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'HR & Behavioral',
    'hr',
    'Behavioral interview questions using the STAR method, covering teamwork, leadership, conflict resolution, and motivation.',
    15
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: DSA Questions
-- ────────────────────────────────────────────────────────────────────────────

insert into public.domain_pack_questions (pack_id, question_text, rubric, category, difficulty) values
  (
    '10000000-0000-0000-0000-000000000001',
    'Explain the time and space complexity of merge sort. Why is it preferred over quicksort in certain scenarios?',
    '{"ideal_keywords":["O(n log n)","stable sort","auxiliary space","divide and conquer","worst case"],"ideal_structure":"Define complexity → compare with quicksort worst case → give use case (linked lists, external sort)","red_flags":["confuses time with space","states worst case as O(n²)","cannot explain stability"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'What is a hash table and how does chaining work for collision resolution? What is the average lookup time?',
    '{"ideal_keywords":["hash function","bucket","linked list","load factor","O(1) average","O(n) worst case"],"ideal_structure":"Define structure → explain hash function → describe chaining with linked lists → state complexities","red_flags":["cannot explain what causes collisions","states always O(1)","confuses chaining with open addressing"]}',
    'technical',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Describe the difference between BFS and DFS. When would you use each, and what are their space complexities?',
    '{"ideal_keywords":["queue","stack","level order","shortest path","O(V+E)","backtracking","connected components"],"ideal_structure":"Define both with data structure used → give time/space complexity → state when to use which","red_flags":["mixes up which uses queue vs stack","cannot state a real use case for each"]}',
    'technical',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'How does dynamic programming differ from naive recursion? Walk through the Fibonacci problem to illustrate memoization and tabulation.',
    '{"ideal_keywords":["overlapping subproblems","optimal substructure","memoization","top-down","bottom-up","tabulation","O(n) vs O(2^n)"],"ideal_structure":"Define DP vs naive recursion → show fib tree → explain memoization cuts redundant calls → show tabulation table","red_flags":["cannot articulate what overlapping subproblems means","states DP is always faster","only knows one approach"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Implement binary search. What are its prerequisites and what is its time and space complexity?',
    '{"ideal_keywords":["sorted array","O(log n)","low mid high","iterative vs recursive","O(1) space iterative","overflow mid"],"ideal_structure":"State prerequisite (sorted) → write algorithm with mid = low + (high-low)/2 → state complexities → mention integer overflow fix","red_flags":["writes mid = (low+high)/2 without overflow discussion","cannot state why array must be sorted","recursive space complexity wrong"]}',
    'technical',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'What is a balanced binary search tree? Why does balance matter? Name two self-balancing BST implementations.',
    '{"ideal_keywords":["AVL tree","Red-Black tree","O(log n)","height","rotation","imbalance","degenerate tree"],"ideal_structure":"Define BST → explain degenerate case O(n) → define balance → name AVL and Red-Black → state use in standard libraries","red_flags":["cannot explain why unbalanced BST degrades","only knows one type","confused about when rotations happen"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Explain amortized time complexity. Give an example using dynamic array resizing.',
    '{"ideal_keywords":["amortized O(1)","aggregate analysis","doubling","occasional O(n)","push_back","total cost divided by operations"],"ideal_structure":"Define amortized as average over sequence → walk through array doubling with copy cost → show total copies = 2n → divide by n = O(1) amortized","red_flags":["confuses amortized with average case","cannot give a concrete example","says all operations are O(1)"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'What data structure would you use to implement an LRU cache? Explain your design and state the time complexities.',
    '{"ideal_keywords":["doubly linked list","hash map","O(1) get","O(1) put","eviction","capacity","head tail sentinel"],"ideal_structure":"State the two structures → explain hash map gives O(1) lookup → linked list gives O(1) move-to-front and eviction → state both ops O(1)","red_flags":["uses only a list (O(n) lookup)","uses only a map (cannot evict in O(1))","cannot explain why both are needed"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Compare arrays and linked lists. What are the time complexities for access, insertion, and deletion? When is each preferred?',
    '{"ideal_keywords":["O(1) access array","O(n) insertion array","O(1) insertion head linked list","cache locality","random access","dynamic size"],"ideal_structure":"Create a side-by-side comparison → state complexities → give real use-case for each → mention cache locality advantage of arrays","red_flags":["incorrect complexities","cannot give a use case","unaware of cache performance differences"]}',
    'technical',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'What is a min-heap and how is it used in Dijkstra''s shortest path algorithm? What is the overall time complexity?',
    '{"ideal_keywords":["min-heap","priority queue","O(log V) extract-min","relaxation","O((V+E) log V)","greedy","visited set"],"ideal_structure":"Define heap property → explain priority queue role in Dijkstra → walk through relaxation step → state total complexity","red_flags":["states O(V²) without clarifying naive vs heap version","cannot explain relaxation","confuses min with max heap"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Explain the sliding window technique. Give a concrete example problem it solves more efficiently than brute force.',
    '{"ideal_keywords":["two pointers","O(n)","window expand contract","maximum subarray","brute force O(n²)","contiguous","sum or distinct elements"],"ideal_structure":"Define the technique → contrast with brute force O(n²) → walk through example (e.g. max sum subarray of size k) → explain how window slides in O(n)","red_flags":["cannot reduce to O(n)","uses two nested loops","cannot give an example problem"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'What is the difference between a directed and undirected graph? How do you represent each in code?',
    '{"ideal_keywords":["adjacency matrix","adjacency list","directed edge","undirected symmetric","O(V²) matrix","O(V+E) list","space trade-off"],"ideal_structure":"Define graph types → compare representations → state space/time trade-offs for each → give use case for each representation","red_flags":["cannot state space complexity of each","unaware of adjacency list","confuses nodes with edges"]}',
    'technical',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Describe the two-pointer technique. Walk through using it to find if a pair in a sorted array sums to a target.',
    '{"ideal_keywords":["sorted array","left pointer","right pointer","O(n)","sum comparison","move inward","brute force O(n²)"],"ideal_structure":"Define technique → state sorted array requirement → walk through left=0 right=n-1 → move based on sum vs target → state O(n) time","red_flags":["skips sorted array prerequisite","cannot walk through the pointer movement logic","states O(n²) complexity"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'How would you detect a cycle in a singly linked list? Describe Floyd''s cycle detection algorithm and its complexity.',
    '{"ideal_keywords":["slow pointer","fast pointer","tortoise and hare","O(n) time","O(1) space","meeting point","null check"],"ideal_structure":"State the problem → describe slow/fast pointer approach → explain they meet if cycle exists → state O(n) time O(1) space → contrast with hash set O(n) space approach","red_flags":["only knows hash set solution","cannot explain why fast/slow pointers meet","states wrong complexity"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'What is memoization? How does it differ from tabulation? Give an example showing both approaches for the same problem.',
    '{"ideal_keywords":["top-down","bottom-up","cache","recursive","iterative","coin change","Fibonacci","space optimization"],"ideal_structure":"Define memoization (top-down, recursive + cache) → define tabulation (bottom-up, iterative table) → use same problem for both → compare trade-offs","red_flags":["thinks they are the same","cannot implement either from scratch","unaware of stack overflow risk in memoization"]}',
    'technical',
    'medium'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: System Design Questions
-- ────────────────────────────────────────────────────────────────────────────

insert into public.domain_pack_questions (pack_id, question_text, rubric, category, difficulty) values
  (
    '10000000-0000-0000-0000-000000000002',
    'Design a URL shortener like bit.ly. Cover the data model, hashing strategy, read/write scaling, and redirects.',
    '{"ideal_keywords":["base62 encoding","collision handling","key-value store","CDN","read heavy","301 vs 302","analytics","sharding"],"ideal_structure":"Clarify requirements → estimate scale → design data model → explain hashing → address read vs write path → mention caching and CDN","red_flags":["no collision handling","ignores analytics requirement","uses sequential IDs without obfuscation"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'How would you design a distributed rate limiter? Discuss algorithms and challenges across multiple nodes.',
    '{"ideal_keywords":["token bucket","leaky bucket","sliding window","Redis","Lua script","race condition","eventual consistency","centralized vs distributed"],"ideal_structure":"State algorithms (token bucket, sliding window) → single node implementation → distributed challenge → Redis atomic ops → trade-offs of each approach","red_flags":["only describes single-node approach","ignores race conditions","cannot name a rate limiting algorithm"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Explain the CAP theorem. Give a real-world example of a system choosing CP and one choosing AP.',
    '{"ideal_keywords":["consistency","availability","partition tolerance","network partition","HBase CP","Cassandra AP","eventual consistency","strong consistency"],"ideal_structure":"Define each CAP property → explain you always need P → show CP vs AP trade-off → give examples: HBase/Zookeeper (CP), Cassandra/DynamoDB (AP)","red_flags":["cannot give real examples","thinks you can have all three","confuses consistency with durability"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Design a notification system for a social media platform at 100M daily active users. Cover push, email, and in-app.',
    '{"ideal_keywords":["message queue","Kafka","fanout","notification preference","worker service","APNs","FCM","deduplication","delivery guarantee"],"ideal_structure":"Define notification types → clarify delivery guarantees → design producer/queue/consumer → handle fanout for celebrities → deduplication → user preferences","red_flags":["no queue — synchronous only","no deduplication","ignores preference management","no retry mechanism"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'How does consistent hashing work? When would you use it in a distributed system, and what problem does it solve?',
    '{"ideal_keywords":["hash ring","virtual nodes","replication","hotspot","minimal redistribution","node addition/removal","load balancing"],"ideal_structure":"Problem with modulo hashing → define hash ring concept → add nodes → minimal key redistribution → virtual nodes for balance → use cases: Cassandra, CDNs","red_flags":["cannot explain why naive modulo fails","unaware of virtual nodes","cannot say what redistributes on node change"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Design a typeahead / search autocomplete feature. Optimize for sub-100ms latency at scale.',
    '{"ideal_keywords":["trie","top-k","prefix matching","Redis sorted set","CDN","client-side debounce","offline computation","caching"],"ideal_structure":"Define requirements → trie for prefix matching → top-k per node → pre-computation offline → Redis cache → CDN for static terms → debounce client side","red_flags":["full text scan in DB","no caching strategy","no top-k consideration"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'What is the difference between horizontal and vertical scaling? When would you choose each and what are the limits?',
    '{"ideal_keywords":["scale up","scale out","single point of failure","load balancer","stateless","cost","physical limit","commodity hardware"],"ideal_structure":"Define both clearly → vertical limits (max hardware) → horizontal with load balancer → stateless requirement → cost comparison → when to use each","red_flags":["confuses the two","cannot state the ceiling of vertical scaling","no mention of statelessness for horizontal"]}',
    'technical',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'How would you design a distributed cache? Discuss consistency, eviction, and failure scenarios.',
    '{"ideal_keywords":["Redis","Memcached","LRU eviction","TTL","write-through","write-back","cache invalidation","thundering herd","replication"],"ideal_structure":"Define use cases → placement strategy (aside, through, back) → eviction policies → TTL → replication for HA → thundering herd protection → consistency challenges","red_flags":["no invalidation strategy","ignores thundering herd","no replication discussion"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Explain database sharding strategies. What are the trade-offs of range sharding vs hash sharding?',
    '{"ideal_keywords":["shard key","range sharding","hash sharding","hotspot","cross-shard query","resharding","consistent hashing","geographic sharding"],"ideal_structure":"Define sharding and why it is needed → range sharding (hotspot risk, good for range queries) → hash sharding (even distribution, bad for range queries) → resharding difficulty","red_flags":["only knows one strategy","cannot explain hotspot","no mention of cross-shard query cost"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Design a real-time leaderboard for a gaming platform. Support global and friend-specific views.',
    '{"ideal_keywords":["Redis sorted set","ZADD","ZRANK","ZRANGE","lazy loading","fan-out","friend list","pagination","score update"],"ideal_structure":"Clarify requirements → Redis sorted set for O(log n) rank ops → score update flow → friend leaderboard via filtering → pagination → periodic persistence to DB","red_flags":["uses relational DB with ORDER BY at scale","no real-time mechanism","ignores friend filtering requirement"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'What is a message queue and when would you prefer asynchronous messaging over synchronous direct API calls?',
    '{"ideal_keywords":["decoupling","durability","backpressure","at-least-once","Kafka","RabbitMQ","retry","fan-out","ordered delivery"],"ideal_structure":"Define message queue → sync vs async trade-off → use cases for async (email sending, report generation) → delivery guarantees → ordering guarantees","red_flags":["cannot articulate when async is better","no mention of delivery guarantees","thinks queues are just for load balancing"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Design a file upload service supporting files up to 5 GB. How do you handle large uploads reliably?',
    '{"ideal_keywords":["multipart upload","presigned URL","S3","chunking","resume upload","checksum","CDN","deduplication","virus scan"],"ideal_structure":"Clarify requirements → presigned URL pattern (bypass backend) → chunked / multipart upload → checksum per chunk → resumable uploads → virus scanning → CDN for serving","red_flags":["streams 5GB through backend server","no retry on failed chunks","no security scanning"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'When would you choose NoSQL over SQL? What are the key differences in data model, consistency, and scaling?',
    '{"ideal_keywords":["schema flexibility","horizontal scale","ACID","BASE","document store","column family","graph DB","eventual consistency","join operations"],"ideal_structure":"Define core SQL properties → define NoSQL types → use case matrix → consistency trade-offs → schema flexibility vs rigidity → when joins are prohibitive","red_flags":["thinks NoSQL is always faster","cannot name NoSQL types","unaware of ACID vs BASE"]}',
    'technical',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Design a real-time collaborative document editing system like Google Docs. Focus on conflict resolution.',
    '{"ideal_keywords":["operational transformation","CRDT","WebSocket","conflict-free","merge","cursor awareness","version vector","server authority","offline support"],"ideal_structure":"Define the challenge (concurrent edits) → OT vs CRDT explanation → WebSocket for real-time → server authority model → cursor broadcast → offline and sync","red_flags":["last-write-wins only","no mention of OT or CRDT","no concurrent edit handling"]}',
    'technical',
    'hard'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'How would you approach database indexing for a high-traffic read-heavy application? What are the trade-offs?',
    '{"ideal_keywords":["B-tree index","composite index","covering index","selectivity","write amplification","index bloat","query planner","EXPLAIN","partial index"],"ideal_structure":"Explain index internals → composite vs single column → covering index for read → selectivity and cardinality → cost on writes → monitoring with EXPLAIN","red_flags":["index everything blindly","unaware of write overhead","cannot explain selectivity"]}',
    'technical',
    'medium'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: HR & Behavioral Questions
-- ────────────────────────────────────────────────────────────────────────────

insert into public.domain_pack_questions (pack_id, question_text, rubric, category, difficulty) values
  (
    '10000000-0000-0000-0000-000000000003',
    'Tell me about yourself. Walk me through your journey — your education, key experiences, and what led you to apply for this role.',
    '{"ideal_keywords":["structured narrative","relevant experience","skills","motivation","connect to role"],"ideal_structure":"Present → past → future: current situation → 1-2 key experiences → why this role specifically. Keep under 2 minutes.","red_flags":["reads a CV verbatim","no connection to role","unclear structure","too long or too short"]}',
    'behavioral',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Describe a situation where you had a significant conflict with a teammate. How did you handle it and what was the outcome?',
    '{"ideal_keywords":["specific situation","listened","empathy","compromise","resolution","follow-up","team outcome"],"ideal_structure":"STAR: Situation (conflict context) → Task (your role) → Action (steps to resolve, listening first) → Result (positive outcome or lesson). Show maturity.","red_flags":["blames the other person entirely","no resolution","avoids conflict entirely","too vague"]}',
    'behavioral',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'What is your greatest professional strength? Give a specific, recent example that demonstrates it in a real work or academic setting.',
    '{"ideal_keywords":["specific strength","concrete example","impact","measurable outcome","relevant to role"],"ideal_structure":"State the strength → give a specific STAR example → quantify impact if possible → connect to why it makes you effective in this role","red_flags":["generic strength with no example","unrelated to role","falsely humble","no measurable impact"]}',
    'behavioral',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Tell me about a time you failed professionally or academically. What happened, and how did you grow from it?',
    '{"ideal_keywords":["honest failure","ownership","lesson learned","changed behavior","growth","not deflecting"],"ideal_structure":"STAR: Describe the real failure → own responsibility → specific lesson → concrete behavior change afterward → evidence the lesson stuck","red_flags":["fake failure disguised as strength","deflects blame","no learning","too minor to be meaningful"]}',
    'behavioral',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Where do you see yourself in 5 years? How does this position align with that vision?',
    '{"ideal_keywords":["growth","skills","realistic","company alignment","leadership or depth","relevant trajectory"],"ideal_structure":"State realistic 5-year goal → explain the progression path → tie this role as a stepping stone → show genuine interest in company","red_flags":["unrealistic (CEO in 2 years)","no connection to role","says they don''t know","too vague"]}',
    'behavioral',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Describe a time you delivered on an extremely tight deadline. What was the situation, how did you prioritize, and what was the result?',
    '{"ideal_keywords":["prioritization","ruthless focus","communication","trade-off","quality vs speed","delivered","stakeholder update"],"ideal_structure":"STAR: Situation (deadline context) → Task (what needed delivery) → Action (how you triaged and executed) → Result (delivered, quality maintained or trade-off communicated)","red_flags":["no prioritization described","ignored quality completely","did not communicate delays","vague result"]}',
    'behavioral',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Tell me about the project you are most proud of. What was your specific technical or leadership contribution?',
    '{"ideal_keywords":["specific contribution","impact","team","challenge","technical detail","outcome","ownership"],"ideal_structure":"Describe the project briefly → state your specific role → explain the challenge you overcame → quantify impact → reflect on pride","red_flags":["describes team output as own","no technical detail","cannot articulate their contribution","vague impact"]}',
    'behavioral',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'How do you handle constructive criticism or feedback that you initially disagree with? Give an example.',
    '{"ideal_keywords":["open mind","clarify","reflect","acted on feedback","improved","non-defensive","growth mindset"],"ideal_structure":"State your approach (listen first, clarify) → give a real example where you received feedback → describe your internal reaction → what you did → outcome","red_flags":["defensive tone","no example","says they are always right","dismisses feedback"]}',
    'behavioral',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Describe a time you had to manage a difficult stakeholder or client. How did you build trust and get alignment?',
    '{"ideal_keywords":["empathy","expectations","regular updates","listen to concerns","compromise","alignment","documented","follow through"],"ideal_structure":"STAR: Who was the stakeholder and why difficult → your task → actions (understand their concern, frequent updates, find common ground) → result (trust rebuilt or project delivered)","red_flags":["blames stakeholder","avoided the person","no active steps taken","vague actions"]}',
    'behavioral',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'What motivates you professionally? Describe an ideal work environment where you would do your best work.',
    '{"ideal_keywords":["intrinsic motivation","learning","impact","autonomy","collaboration","honest answer","aligns with company"],"ideal_structure":"Be specific about your motivators → connect to a real experience → describe ideal environment → naturally tie to what the company offers","red_flags":["only mentions salary","generic answer","contradicts the company''s culture","overly idealistic"]}',
    'behavioral',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Tell me about a time you took initiative or went beyond your formal job responsibilities. What drove you to do it?',
    '{"ideal_keywords":["proactive","self-directed","impact beyond role","recognized a gap","ownership","outcome"],"ideal_structure":"STAR: Context of what your formal role was → what you noticed missing → action you took without being asked → result and recognition","red_flags":["describes assigned work","no quantifiable outcome","too minor","no explanation of motivation"]}',
    'behavioral',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'You have three high-priority tasks due at the same time. How do you decide what to work on first?',
    '{"ideal_keywords":["impact","urgency","communicate","trade-off","dependencies","stakeholder","re-negotiate","ask for help"],"ideal_structure":"Framework for prioritization (impact × urgency) → communicate early if a deadline is at risk → check dependencies → ask for help or negotiate scope","red_flags":["no framework","takes on all three silently and delivers nothing","no communication to stakeholders"]}',
    'situational',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Describe a situation where you had to adapt quickly to a major unexpected change in your project or team.',
    '{"ideal_keywords":["pivoted","reframed","resilience","new plan","communicated","remained positive","learned"],"ideal_structure":"STAR: What was the unexpected change and its impact → your initial reaction → how you reframed and made a plan → actions taken → outcome","red_flags":["shows inability to adapt","blames others for the change","no proactive response described"]}',
    'behavioral',
    'medium'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Why do you want to work at this company specifically? What excites you most about this role?',
    '{"ideal_keywords":["specific research","company mission","product or tech","team culture","career fit","genuine interest","not just salary"],"ideal_structure":"Specific thing about the company (product, mission, tech stack, culture) → connect to your experience or values → what excites you in this specific role → long-term fit","red_flags":["generic answer applicable to any company","only mentions salary or brand","clearly not researched the company"]}',
    'behavioral',
    'easy'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Tell me about a time you mentored a junior colleague or helped a teammate improve. What was your approach?',
    '{"ideal_keywords":["empathy","tailored feedback","patience","follow-up","growth of mentee","teaching","pair programming or sessions"],"ideal_structure":"STAR: Who and what context → their gap → your approach (regular check-ins, pair work, constructive feedback) → measurable improvement in their work","red_flags":["just assigned them work","no follow-up","cannot describe the other person''s growth","takes credit for their output"]}',
    'behavioral',
    'medium'
  );
END $seed$;
