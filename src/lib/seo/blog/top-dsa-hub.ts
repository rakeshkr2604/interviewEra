export const TOP_DSA_HERO_PATH = '/blog/top-dsa-interview-questions-hero.png'
export const TOP_DSA_HERO_ALT =
  'Top DSA interview questions and topic map — arrays, hashing, trees, graphs, dynamic programming, and preparation roadmap for coding interviews in India'
export const TOP_DSA_HERO_WIDTH = 1536
export const TOP_DSA_HERO_HEIGHT = 1024
export const TOP_DSA_META_TITLE = 'Top DSA Interview Questions (2026)'
export const TOP_DSA_DESCRIPTION =
  'DSA interview prep guide for India 2026 — topic map, company expectations, top 50 problems, patterns, roadmap, and communication tips for campus OAs.'
export const TOP_DSA_CANONICAL_PATH = '/blog/top-dsa-interview-questions'
export const TOP_DSA_PUBLISHED_DATE = '2026-05-01'
export const TOP_DSA_LAST_UPDATED = '2026-06-06'
export const TOP_DSA_UPDATED_LABEL = 'Updated June 2026'
export const TOP_DSA_REVIEWED_DATE = '2026-06-06'
export const TOP_DSA_READING_TIME = '24 min read'
export const TOP_DSA_AUTHOR_NAME = 'InterviewEra Team'
export const TOP_DSA_REVIEWER_NAME = 'InterviewEra Editorial'
export const TOP_DSA_EDITORIAL_NOTE =
  'Content reviewed and updated for 2026 campus OAs, product company coding rounds, and DSA pattern frequency across TCS, Infosys, Amazon, Microsoft, and Google interview loops in India.'

export const TOP_DSA_TOC_SECTIONS = [
  { id: 'topic-landscape', label: 'Topic landscape (chart)' },
  { id: 'dsa-learning-roadmap', label: 'DSA Learning Roadmap' },
  { id: 'company-expectations', label: 'Company-wise DSA Expectations' },
  { id: 'dsa-patterns', label: 'DSA Patterns' },
  { id: 'pattern-topic-map', label: 'Interview Patterns vs Topics' },
  { id: 'top-50-problems', label: 'Top 50 Must-Know Problems' },
  { id: 'arrays-hashing', label: 'Arrays, strings & hashing' },
  { id: 'two-pointers', label: 'Two pointers & sliding window' },
  { id: 'linked-lists', label: 'Linked lists' },
  { id: 'trees', label: 'Trees & BST' },
  { id: 'graphs', label: 'Graphs' },
  { id: 'dynamic-programming', label: 'Dynamic programming' },
  { id: 'binary-search-heaps', label: 'Binary search & heaps' },
  { id: 'interview-communication', label: 'Interview Communication' },
  { id: 'prep-timeline', label: 'Prep timeline (chart)' },
  { id: 'mistakes', label: 'Mistakes that cost offers' },
  { id: 'contextual-links', label: 'Related Preparation Guides' },
  { id: 'faq', label: 'FAQ' },
] as const

export const TOP_DSA_LEARNING_ROADMAP_PATH = '/blog/dsa-learning-roadmap-2026.png'
export const TOP_DSA_LEARNING_ROADMAP_ALT =
  'DSA learning roadmap 2026 — beginner fundamentals through arrays, hashing, linked lists, trees, graphs, dynamic programming, mock interviews, and interview readiness'
export const TOP_DSA_LEARNING_ROADMAP_WIDTH = 1774
export const TOP_DSA_LEARNING_ROADMAP_HEIGHT = 887

export const TOP_DSA_LEARNING_ROADMAP_STEPS = [
  {
    step: 'Beginner',
    body: 'Build problem-solving basics, learn time and space complexity notation, and practice simple brute-force problems before pattern templates.',
  },
  {
    step: 'Arrays',
    body: 'Master linear data structures — prefix sum, sliding window, and two pointers cover the majority of OA round-1 problems.',
  },
  {
    step: 'Hashing',
    body: 'Learn hash tables, maps, and sets. Frequency maps and counting patterns unlock two-sum variants and anagram problems.',
  },
  {
    step: 'Linked Lists',
    body: 'Handle dynamic structures with fast/slow pointers — reverse, merge, detect cycle, and remove nth node from end.',
  },
  {
    step: 'Trees',
    body: 'Explore hierarchical structures — traversals, BST validation, LCA, diameter, and level-order BFS on trees.',
  },
  {
    step: 'Graphs',
    body: 'Solve connected-component and shortest-path problems with BFS, DFS, topological sort, and union-find.',
  },
  {
    step: 'Dynamic Programming',
    body: 'Tackle optimization with memoization vs tabulation — start 1D (stairs, robber, coin change) before 2D (LCS, edit distance).',
  },
  {
    step: 'Mock Interviews',
    body: 'Simulate real loops with company-wise question sets, timed OAs, and spoken complexity analysis under pressure.',
  },
  {
    step: 'Interview Ready',
    body: 'Revise high-frequency problems, revisit weak patterns, and stay consistent — readiness is cumulative, not last-minute cramming.',
  },
] as const

export const TOP_DSA_PATTERN_TOPIC_ROWS = [
  ['Sliding Window', 'Arrays, Strings, Hashing'],
  ['Two Pointers', 'Arrays, Linked Lists, Strings'],
  ['Prefix Sum', 'Arrays, Hashing'],
  ['Binary Search', 'Arrays, Trees, Heaps'],
  ['DFS', 'Trees, Graphs, Backtracking'],
  ['BFS', 'Graphs, Trees, Matrices'],
  ['Backtracking', 'Trees, Graphs, Arrays, Strings'],
  ['Greedy', 'Arrays, Graphs, Heaps, Intervals'],
  ['Dynamic Programming', 'Arrays, Strings, Trees, Graphs'],
] as const

export const TOP_DSA_COMPANY_ROWS = [
  ['TCS', 'Easy–Medium', 'Arrays, strings, basic sorting, aptitude-heavy OAs', 'Fresher / 0–1 yr (NQT pipeline)'],
  ['Infosys', 'Easy–Medium', 'Arrays, hashing, linked lists, InfyTQ MCQs + coding', 'Fresher / 0–1 yr (InfyTQ, HackWithInfy)'],
  ['Wipro', 'Easy–Medium', 'Arrays, strings, basic DS, logic & verbal sections', 'Fresher / 0–1 yr (Elite NTH, campus drive)'],
  ['Accenture', 'Easy–Medium', 'Arrays, pseudocode, DBMS/SQL MCQs, coding basics', 'Fresher / 0–1 yr (ASE track)'],
  ['Freshworks', 'Medium', 'JavaScript DSA, arrays, hashing, moderate OA problems', '1–3 yr (Frontend / SWE product roles)'],
  ['Amazon', 'Hard', 'Trees, graphs, DP, two pointers, Bar Raiser depth', 'SDE I–II (OA + 2 live coding rounds)'],
  ['Microsoft', 'Medium–Hard', 'Arrays, trees, graphs, binary search, system design at senior', 'SDE I–II (OA + coding loop)'],
  ['Google', 'Hard', 'Graphs, DP, trees, advanced optimization, Googleyness', 'L3–L4 (phone screen + onsite coding)'],
] as const

export const TOP_DSA_PATTERNS = [
  {
    pattern: 'Sliding Window',
    whenToUse: 'Contiguous subarray/substring problems with a running constraint — max sum, longest unique substring, fixed-size window.',
    commonProblems: ['Longest substring without repeating characters', 'Minimum window substring', 'Max sum subarray of size k', 'Fruit into baskets'],
  },
  {
    pattern: 'Two Pointers',
    whenToUse: 'Sorted arrays, palindrome checks, pair-sum problems, or squeezing window boundaries from both ends.',
    commonProblems: ['Two sum II (sorted)', 'Container with most water', '3Sum', 'Valid palindrome'],
  },
  {
    pattern: 'Prefix Sum',
    whenToUse: 'Range sum queries, subarray sum equals k, cumulative frequency tracking over indices.',
    commonProblems: ['Subarray sum equals k', 'Range sum query', 'Continuous subarray sum', 'Product of array except self'],
  },
  {
    pattern: 'Binary Search',
    whenToUse: 'Sorted data, monotonic answer spaces, or “find minimum/maximum feasible value” optimization problems.',
    commonProblems: ['Search in rotated sorted array', 'Koko eating bananas', 'Find minimum in rotated array', 'Median of two sorted arrays'],
  },
  {
    pattern: 'DFS',
    whenToUse: 'Tree/graph traversal, connected components, path exploration, backtracking branches where depth-first is natural.',
    commonProblems: ['Number of islands', 'Path sum', 'Clone graph', 'Word search'],
  },
  {
    pattern: 'BFS',
    whenToUse: 'Shortest path in unweighted graphs, level-order traversal, minimum steps/spread problems.',
    commonProblems: ['Rotten oranges', 'Word ladder', 'Binary tree level order', 'Shortest path in binary matrix'],
  },
  {
    pattern: 'Backtracking',
    whenToUse: 'Generate all combinations/permutations, constraint satisfaction, explore and undo choices.',
    commonProblems: ['Subsets', 'Permutations', 'Combination sum', 'N-Queens', 'Word search II'],
  },
  {
    pattern: 'Greedy',
    whenToUse: 'Local optimal choices lead to global optimum — scheduling, interval merging, Huffman-style problems.',
    commonProblems: ['Merge intervals', 'Jump game', 'Non-overlapping intervals', 'Assign cookies'],
  },
  {
    pattern: 'Dynamic Programming',
    whenToUse: 'Overlapping subproblems + optimal substructure — counting paths, knapsack family, sequence alignment.',
    commonProblems: ['Climbing stairs', 'House robber', 'Coin change', 'Longest increasing subsequence', 'Edit distance'],
  },
] as const

export const TOP_DSA_MUST_KNOW_PROBLEMS = [
  {
    topic: 'Arrays',
    problems: [
      'Two Sum',
      'Best Time to Buy and Sell Stock',
      'Product of Array Except Self',
      'Maximum Subarray (Kadane)',
      'Merge Intervals',
      'Rotate Array',
      'Find Missing Number',
      'Container With Most Water',
      'Trapping Rain Water',
    ],
  },
  {
    topic: 'Hashing',
    problems: [
      'Group Anagrams',
      'Valid Anagram',
      'Longest Consecutive Sequence',
      'Subarray Sum Equals K',
      'Top K Frequent Elements',
      'First Missing Positive',
      'Longest Substring Without Repeating Characters',
      'Isomorphic Strings',
    ],
  },
  {
    topic: 'Linked Lists',
    problems: [
      'Reverse Linked List',
      'Merge Two Sorted Lists',
      'Linked List Cycle',
      'Remove Nth Node From End',
      'Reorder List',
      'Add Two Numbers',
      'Copy List with Random Pointer',
    ],
  },
  {
    topic: 'Trees',
    problems: [
      'Maximum Depth of Binary Tree',
      'Invert Binary Tree',
      'Diameter of Binary Tree',
      'Lowest Common Ancestor of BST',
      'Validate Binary Search Tree',
      'Binary Tree Level Order Traversal',
      'Serialize and Deserialize Binary Tree',
      'Path Sum III',
      'Construct Binary Tree from Preorder and Inorder',
    ],
  },
  {
    topic: 'Graphs',
    problems: [
      'Number of Islands',
      'Course Schedule',
      'Rotting Oranges',
      'Word Ladder',
      'Clone Graph',
      'Pacific Atlantic Water Flow',
      'Network Delay Time',
      'Redundant Connection',
    ],
  },
  {
    topic: 'Dynamic Programming',
    problems: [
      'Climbing Stairs',
      'House Robber',
      'Coin Change',
      'Longest Increasing Subsequence',
      'Word Break',
      'Unique Paths',
      'Edit Distance',
      'Maximum Product Subarray',
      'Partition Equal Subset Sum',
    ],
  },
] as const

export const TOP_DSA_COMMUNICATION_TOPICS = [
  {
    title: 'Explaining your approach',
    body: 'Before coding, restate the problem, confirm constraints, and walk through 1–2 examples including edge cases. Interviewers grade whether you de-risk ambiguity before writing code.',
    tip: 'Use a 30-second outline: brute force → bottleneck → optimized approach. Ask “Does this match what you had in mind?” before implementing.',
  },
  {
    title: 'Complexity discussion',
    body: 'Always state time and space complexity after your solution. Explain why — count nested loops, hash map lookups, recursion depth — not just Big-O labels.',
    tip: 'Compare brute force vs optimized complexity aloud. Example: “Hash map brings this from O(n²) to O(n) with O(n) extra space.”',
  },
  {
    title: 'Optimization discussion',
    body: 'Interviewers often ask “Can you do better?” even after a correct answer. Know trade-offs: time vs space, preprocessing vs query, iterative vs recursive.',
    tip: 'If stuck, say what you would try next — sorting, two pointers, prefix sums — rather than going silent.',
  },
  {
    title: 'Interviewer communication',
    body: 'Think aloud during coding. Flag when you are stuck, state assumptions, and recover gracefully from bugs. Silence reads as inability, not deep thinking.',
    tip: 'Run a dry-run on your example before saying “done.” Verbalize each line’s purpose as you write it.',
  },
] as const

export const TOP_DSA_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Questions' },
  { href: '/interview-questions/companies/amazon/software-engineer', label: 'Amazon SWE Questions' },
  { href: '/interview-questions/companies/microsoft/software-engineer', label: 'Microsoft SWE Questions' },
  { href: '/interview-questions/companies/infosys/software-engineer', label: 'Infosys SWE Questions' },
  { href: '/interview-questions/java-developer', label: 'Java Developer Questions' },
  { href: '/interview-questions/frontend-developer', label: 'Frontend Developer Questions' },
  { href: '/interview-questions/companies/google/software-engineer', label: 'Google SWE Questions' },
  { href: '/interview-questions/companies/freshworks/software-engineer', label: 'Freshworks SWE Questions' },
  { href: '/interview-questions/companies/freshworks/frontend-developer', label: 'Freshworks Frontend Questions' },
  { href: '/interview-questions/tcs', label: 'TCS Interview Questions' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Interview Questions' },
  { href: '/interview-questions/companies/accenture', label: 'Accenture Interview Questions' },
  { href: '/interview-questions/companies/infosys/java-developer', label: 'Infosys Java Questions' },
  { href: '/interview-questions/companies/tcs/java-developer', label: 'TCS Java Questions' },
  { href: '/interview-questions/topics/algorithms', label: 'Algorithms Interview Questions' },
  { href: '/blog/agentic-ai-interview-round-2026', label: 'Agentic AI Interview Round Guide' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Questions' },
  { href: '/interview-questions/topics/javascript', label: 'JavaScript Interview Questions' },
  { href: '/interview-questions/topics/react', label: 'React Interview Questions' },
  { href: '/blog/top-interview-questions-for-software-engineers', label: 'Top SWE Interview Questions' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Questions' },
  { href: '/blog/overcome-interview-anxiety-mock-interviews', label: 'Behavioral Interview Prep' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Interview Guide' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/tools/question-generator', label: 'Free Question Generator' },
  { href: '/signup', label: 'InterviewEra Mock Interviews' },
] as const

export const TOP_DSA_FAQ_ITEMS = [
  {
    question: 'How many DSA problems should I solve before interviews?',
    answer: 'Aim for 150–200 quality problems across patterns rather than 500 random solves. Cover top 50 must-know problems deeply, then expand by weak patterns. Re-solve key problems after 5–7 days for retention.',
  },
  {
    question: 'Which DSA topic is most important for campus placements?',
    answer: 'Arrays and hashing appear most frequently in Indian campus OAs (TCS NQT, Infosys InfyTQ, Wipro Elite). Master two pointers, sliding window, and prefix sum before moving to trees and graphs.',
  },
  {
    question: 'Is LeetCode enough for DSA interview prep?',
    answer: 'LeetCode is a strong practice platform but not sufficient alone. Pair problem-solving with timed OAs, spoken mock interviews, and company-specific pattern review. Communication and complexity analysis matter as much as AC rate.',
  },
  {
    question: 'How long does DSA prep take for product companies?',
    answer: 'Most candidates need 8–12 focused weeks: 4 weeks on arrays/hashing/lists, 3 weeks on trees/graphs, 2 weeks on DP, and ongoing mocks from week 6 onward. Amazon and Google typically require the full timeline.',
  },
  {
    question: 'Do service companies ask hard DSA questions?',
    answer: 'TCS, Infosys, Wipro, and Accenture focus on easy–medium arrays, strings, and basic logic in OAs. Live technical rounds may add linked lists or simple trees but rarely hard DP or graph optimization.',
  },
  {
    question: 'Should I learn DSA in Java or C++?',
    answer: 'Use whichever language you will code in during interviews. Java and C++ are both common in India campus drives. Python is acceptable at many product companies but confirm with your target company first.',
  },
  {
    question: 'What is the best order to learn DSA topics?',
    answer: 'Follow the learning roadmap: Beginner → Arrays → Hashing → Linked Lists → Trees → Graphs → Dynamic Programming → Mock Interviews → Interview Ready. Each stage builds on the previous — skipping hashing makes tree and graph problems harder.',
  },
  {
    question: 'How important is dynamic programming for fresher interviews?',
    answer: 'DP is less frequent in service-company OAs but is a high-variance filter at Amazon, Google, and Microsoft. Learn 1D DP (climbing stairs, house robber, coin change) before 2D DP (LCS, edit distance).',
  },
  {
    question: 'How do I practice DSA under time pressure?',
    answer: 'Simulate OAs weekly: 2–3 problems in 60–90 minutes with no hints. Use a timer for individual problems (25–35 min). Track which patterns slow you down and drill those specifically.',
  },
  {
    question: 'What DSA patterns appear most in Amazon interviews?',
    answer: 'Amazon SDE loops heavily test trees, graphs, BFS/DFS, two pointers, and medium DP. OA filters on arrays and strings first — strong OA performance is required before live coding rounds.',
  },
  {
    question: 'Can I skip graphs if I am targeting service companies?',
    answer: 'For TCS/Wipro/Accenture campus drives, basic graph awareness is enough. Infosys Power Programmer and all product company tracks require BFS/DFS fluency — do not skip graphs if you have product company targets.',
  },
  {
    question: 'How do I explain time complexity in interviews?',
    answer: 'Count operations as a function of input size n. State best, average, and worst case when relevant. Tie complexity to your data structures: “Hash map lookups are O(1), so the overall loop is O(n).” Always mention space complexity too.',
  },
] as const

/**
 * Audit status (2026-06-06):
 * PRODUCTION READY — hero + learning roadmap infographic, 9-step progression, pattern-topic map table, company table, top 50 problems, 26 contextual links.
 * SEO READY — self-canonical, index/follow, Article/FAQPage/BreadcrumbList JSON-LD, E-E-A-T metadata.
 * INDEXING READY — blog sitemap entry with updated lastmod; indexable marketing route.
 */
