import type { SeoQuestion } from '@/lib/seo/programmatic/types'

export const ANDROID_HERO_PATH = '/blog/android-developer-hero.png'
export const ANDROID_HERO_ALT =
  'Android Developer interview preparation guide covering Kotlin, Jetpack Compose, MVVM, coroutines, system design, and hiring process for India 2026'
export const ANDROID_HERO_WIDTH = 1536
export const ANDROID_HERO_HEIGHT = 1024

export const ANDROID_PROCESS_PATH = '/blog/android-developer-process-2026.png'
export const ANDROID_PROCESS_ALT =
  'Android Developer hiring process 2026 — Application, Online Assessment, Technical Rounds 1 and 2, Project Discussion, HR, and Offer'
export const ANDROID_PROCESS_WIDTH = 1774
export const ANDROID_PROCESS_HEIGHT = 887

export const ANDROID_META_TITLE = 'Android Developer Interview Questions and Answers (2026)'
export const ANDROID_CANONICAL_PATH = '/interview-questions/android-developer'
export const ANDROID_DESCRIPTION =
  'Complete Android interview preparation guide for India 2026 — hiring process, Kotlin, Jetpack Compose, MVVM, coroutines, system design, project discussion, 4-week roadmap, and expert answers.'
export const ANDROID_PUBLISHED_DATE = '2026-05-21'
export const ANDROID_LAST_UPDATED = '2026-06-06'
export const ANDROID_REVIEWED_DATE = '2026-06-06'
export const ANDROID_READING_TIME = '28 min read'
export const ANDROID_AUTHOR_NAME = 'InterviewEra Team'
export const ANDROID_REVIEWER_NAME = 'InterviewEra Editorial'
export const ANDROID_EDITORIAL_NOTE =
  'Content reviewed and updated for 2026 Android hiring loops at product companies and service firms in India — Kotlin-first panels, Jetpack Compose adoption, MVVM architecture depth, coroutines, and system design for mobile apps.'

export const ANDROID_TOC_SECTIONS = [
  { id: 'android-hiring-process', label: 'Android Hiring Process' },
  { id: 'android-roadmap', label: 'Android Roadmap' },
  { id: 'android-fundamentals', label: 'Android Fundamentals' },
  { id: 'activity-lifecycle', label: 'Activity Lifecycle' },
  { id: 'jetpack-components', label: 'Jetpack Components' },
  { id: 'kotlin-interview-questions', label: 'Kotlin Interview Questions' },
  { id: 'coroutines', label: 'Coroutines' },
  { id: 'android-architecture-flow', label: 'Android Architecture Flow' },
  { id: 'jetpack-compose', label: 'Jetpack Compose' },
  { id: 'android-system-design', label: 'Android System Design' },
  { id: 'project-discussion', label: 'Project Discussion' },
  { id: 'resume-examples', label: 'Resume Examples' },
  { id: 'preparation-roadmap', label: 'Preparation Roadmap' },
  { id: 'android-questions', label: 'Interview Questions' },
  { id: 'android-faq', label: 'FAQ' },
] as const

export const ANDROID_HIRING_STEPS = [
  {
    step: 'Step 1 — Application',
    body: 'Recruiters scan for Kotlin/Android project depth, Play Store links or GitHub repos, and measurable impact (DAU, crash-free rate, performance). Tailor your resume to MVVM, Jetpack, and one shipped app you can demo live.',
  },
  {
    step: 'Step 2 — Online Assessment',
    body: 'Timed OA covering Java/Kotlin MCQs, DSA (arrays, strings, hash maps), and sometimes SQL or aptitude. Practice under 60–90 minute clocks — many Indian campus and lateral pipelines filter hard here.',
  },
  {
    step: 'Step 3 — Technical Round 1',
    body: 'Activity lifecycle, Fragments, RecyclerView, Intents, and basic architecture. Expect whiteboard or live coding on list screens, navigation, and lifecycle-aware components. Panels test fundamentals before frameworks.',
  },
  {
    step: 'Step 4 — Technical Round 2',
    body: 'MVVM, coroutines, Jetpack Compose, Room, Retrofit, and Clean Architecture trade-offs. Deeper than Round 1 — often includes “how would you refactor this screen?” and threading questions.',
  },
  {
    step: 'Step 5 — Project Discussion',
    body: 'Walk through your best Android app: architecture, offline strategy, API integration, performance fixes, and Firebase/analytics if used. Interviewers probe decisions, not slide decks.',
  },
  {
    step: 'Step 6 — HR round',
    body: 'Communication, teamwork, salary expectations, and notice period. Prepare “why Android,” cross-platform trade-offs (Flutter/RN), and a concise story about a production bug or release you owned.',
  },
  {
    step: 'Step 7 — Offer',
    body: 'Selected candidates receive compensation details and onboarding timelines. Android Developer packages in India typically range 6–18 LPA for 0–3 YOE at product/service mix — negotiate after level confirmation.',
  },
] as const

export const ANDROID_ROADMAP_PATH = '/blog/android-developer-roadmap-2026.png'
export const ANDROID_ROADMAP_ALT =
  'Android Developer roadmap 2026 — Android Basics, Kotlin, UI Components, Architecture, Networking, Local Storage, Compose, System Design, and Interview Ready'
export const ANDROID_ROADMAP_WIDTH = 1672
export const ANDROID_ROADMAP_HEIGHT = 941

export const ANDROID_FUNDAMENTALS_TOPICS = [
  {
    topic: 'Four app components',
    evaluates: 'Activity, Service, BroadcastReceiver, ContentProvider — when to use each and how they are declared in AndroidManifest.xml.',
    mistakes: 'Treating every background task as a Service, or unable to explain ContentProvider use cases beyond “database sharing.”',
    tips: 'Map each component to one real app scenario: Activity for screens, Service for music playback, Receiver for boot/connectivity, Provider for contact sync.',
  },
  {
    topic: 'Application class & manifest',
    evaluates: 'Global initialization, permission declarations, intent filters, and multi-module manifest merging basics.',
    mistakes: 'Putting heavy work in Application.onCreate without lazy init, or missing exported flag on components for Android 12+.',
    tips: 'Review manifest merge conflicts in multi-module apps. Know dangerous permissions vs normal permissions.',
  },
  {
    topic: 'Context & resources',
    evaluates: 'Application vs Activity context, memory leak patterns, configuration qualifiers, and themes/styles.',
    mistakes: 'Long-lived references to Activity context, or hardcoding strings/dimensions instead of resources.',
    tips: 'Use applicationContext for singletons. Explain why leaking Activity context causes OOM on rotation.',
  },
  {
    topic: 'Permissions model',
    evaluates: 'Runtime permissions (API 23+), special permissions, and backward-compatible permission flows.',
    mistakes: 'Assuming manifest-only permissions work on Android 6+, or not handling “don’t ask again” UX.',
    tips: 'Practice location/camera permission flow with ActivityResultContracts. Mention shouldShowRequestPermissionRationale.',
  },
] as const

export const ANDROID_LIFECYCLE_STAGES = [
  { stage: 'onCreate', detail: 'Initialize UI, bind ViewModel, set content. One-time setup — avoid heavy I/O on main thread.' },
  { stage: 'onStart / onResume', detail: 'Activity visible and interactive. Start animations, register listeners, refresh data.' },
  { stage: 'onPause', detail: 'Partially obscured — save lightweight state, pause video, release camera if needed.' },
  { stage: 'onStop', detail: 'Fully hidden. Unregister listeners that are not needed in background.' },
  { stage: 'onDestroy', detail: 'Final cleanup. Distinguish config change vs finishing — ViewModel survives rotation, Activity may not.' },
] as const

export const ANDROID_JETPACK_TOPICS = [
  {
    topic: 'ViewModel',
    evaluates: 'Survives configuration changes, holds UI state, exposes StateFlow/LiveData, scoped to ViewModelStoreOwner.',
    mistakes: 'Storing Activity/View references in ViewModel, or putting Android framework APIs directly in ViewModel.',
    tips: 'Inject Repository via constructor. Use viewModelScope for coroutines. Explain why ViewModel outlives rotation.',
  },
  {
    topic: 'Room',
    evaluates: 'Entity, DAO, Database, migrations, and compile-time SQL validation with Flow return types.',
    mistakes: 'Main-thread database access, or schema changes without migration strategy.',
    tips: 'Show one DAO with @Query Flow and suspend insert. Mention TypeConverters for complex types.',
  },
  {
    topic: 'Navigation Component',
    evaluates: 'NavGraph, Safe Args, deep links, and single-Activity multi-Fragment architecture.',
    mistakes: 'Manual FragmentTransaction backstack bugs, or passing non-parcelable complex objects via bundles.',
    tips: 'Prefer typed Safe Args. Explain popUpTo and inclusive for login → home flows.',
  },
  {
    topic: 'WorkManager',
    evaluates: 'Deferrable background work with constraints (network, charging) vs foreground Service for user-visible tasks.',
    mistakes: 'Using WorkManager for immediate UI-critical tasks, or Services for deferrable sync.',
    tips: 'Contrast WorkManager with coroutines + Repository for in-app sync. Know when Foreground Service is required.',
  },
  {
    topic: 'DataStore',
    evaluates: 'Preferences DataStore vs Proto DataStore as SharedPreferences replacement with coroutine APIs.',
    mistakes: 'Still using SharedPreferences on new projects without migration plan.',
    tips: 'Mention atomic updates and type safety. Pair with Repository for settings layer.',
  },
] as const

export const ANDROID_KOTLIN_TOPICS = [
  {
    topic: 'Data classes',
    evaluates: 'Auto-generated equals/hashCode/copy, component functions, and immutability for UI state models.',
    mistakes: 'Mutable var properties in state models, or using data class for classes with inheritance needs.',
    tips: 'Use copy() for state updates in ViewModel. Contrast with regular classes for sealed hierarchies.',
  },
  {
    topic: 'Sealed classes',
    evaluates: 'Exhaustive when expressions for UI state (Loading/Success/Error) and network result wrappers.',
    mistakes: 'Using enum for states that carry payload data, or forgetting sealed interface for modular modules.',
    tips: 'Model ApiResult as sealed class. Show compiler-enforced exhaustive when in UI layer.',
  },
  {
    topic: 'Extension functions',
    evaluates: 'Adding behavior without inheritance — View binding helpers, String validation, Context utilities.',
    mistakes: 'Extension abuse creating god-util files, or extensions that should be member functions.',
    tips: 'Keep extensions scoped by file/package. Explain they are static dispatch, not true polymorphism.',
  },
  {
    topic: 'Scope functions',
    evaluates: 'let, run, with, apply, also — choosing the right one for null checks, configuration, and side effects.',
    mistakes: 'Nesting five scope functions unreadably, or using apply when let is clearer for transformations.',
    tips: 'Memorize: apply/also return context; let/run/with return lambda result. Use table in interviews.',
  },
  {
    topic: 'Collections',
    evaluates: 'map/filter/reduce, sequences for lazy chains, groupBy, and immutable vs mutable collection choices.',
    mistakes: 'Imperative loops where functional chains are clearer, or O(n²) filter-in-loop patterns.',
    tips: 'Practice transforming API DTO lists to UI models with map + filter. Mention sequence for large datasets.',
  },
] as const

export const ANDROID_COROUTINES_TOPICS = [
  {
    topic: 'launch',
    evaluates: 'Fire-and-forget coroutine in a scope — viewModelScope, lifecycleScope — with structured cancellation.',
    mistakes: 'GlobalScope.launch in production, or launch without exception handler for UI-critical work.',
    tips: 'Always tie to a scope that cancels on clear. Show try/catch or supervisorScope for parallel tasks.',
  },
  {
    topic: 'async',
    evaluates: 'Deferred results, parallel API calls with async/await pattern, and combining results.',
    mistakes: 'Sequential await of independent calls, or async without structured concurrency parent.',
    tips: 'Fetch profile + settings in parallel with async/await. Explain lazy start until await.',
  },
  {
    topic: 'suspend',
    evaluates: 'Suspending functions, continuation passing, and why they do not block threads.',
    mistakes: 'Calling suspend functions from non-coroutine context, or blocking with runBlocking on Main.',
    tips: 'Trace one Retrofit suspend call from ViewModel through Dispatcher.IO to Main state update.',
  },
  {
    topic: 'Dispatchers',
    evaluates: 'Main, IO, Default, Unconfined — choosing dispatcher for UI, network, CPU work.',
    mistakes: 'Network on Main, or heavy JSON parsing on Main inside collect.',
    tips: 'Rule: UI on Main, I/O on IO, sorting on Default. Mention withContext for switching.',
  },
  {
    topic: 'Structured concurrency',
    evaluates: 'Parent-child job hierarchy, cancellation propagation, supervisorJob, and coroutineScope vs supervisorScope.',
    mistakes: 'Orphan coroutines after ViewModel cleared, or catching CancellationException incorrectly.',
    tips: 'Explain viewModelScope cancels all children on onCleared. Never swallow CancellationException.',
  },
] as const

export const ANDROID_MVVM_ARCHITECTURE_PATH = '/blog/android-developer-mvvm-architecture-2026.png'
export const ANDROID_MVVM_ARCHITECTURE_ALT =
  'Android MVVM architecture data flow — UI, ViewModel, Repository, Room and Retrofit, and data sources with separation of concerns, scalability, and testability'
export const ANDROID_MVVM_ARCHITECTURE_WIDTH = 1774
export const ANDROID_MVVM_ARCHITECTURE_HEIGHT = 887

export const ANDROID_ARCHITECTURE_PRINCIPLES = [
  {
    title: 'Separation of concerns',
    body: 'UI renders state and forwards events — no business logic in Activity or Composable. ViewModel holds presentation logic and survives rotation. Repository owns data orchestration (cache vs network). Data sources (Room DAO, Retrofit service) know nothing about UI.',
  },
  {
    title: 'Scalability',
    body: 'Feature modules, clear Repository contracts, and unidirectional data flow let teams ship in parallel. New screens reuse existing Repositories; API changes stay isolated behind data-layer interfaces. Compose and Navigation scale to large apps when state is hoisted correctly.',
  },
  {
    title: 'Testability',
    body: 'ViewModels unit-test without Robolectric by faking Repository. Repositories test with in-memory Room or mock web servers. UI tests (Espresso / Compose Test) verify critical flows only — not every branch. DI (Hilt) makes swapping fakes trivial in tests.',
  },
] as const

export const ANDROID_COMPOSE_TOPICS = [
  {
    topic: 'Recomposition',
    evaluates: 'When Compose re-runs composables, stability, and skipping unchanged subtrees.',
    mistakes: 'Creating unstable lambdas/objects in composition causing full recompose storms.',
    tips: 'Use remember and stable keys. Explain compiler skipping vs forced recomposition.',
  },
  {
    topic: 'State',
    evaluates: 'State<T>, mutableStateOf, state hoisting, and unidirectional data flow with ViewModel.',
    mistakes: 'Mutable state in composable without remember, or duplicating ViewModel state locally.',
    tips: 'Hoist state to ViewModel for business logic; keep ephemeral UI state (scroll) local with rememberSaveable.',
  },
  {
    topic: 'remember',
    evaluates: 'remember, rememberSaveable, derivedStateOf, and caching expensive calculations across recompositions.',
    mistakes: 'Heavy work in composable body without remember, or rememberSaveable for non-Saver types.',
    tips: 'Pair remember with keys for list items. Use derivedStateOf for computed filter state.',
  },
  {
    topic: 'Navigation',
    evaluates: 'Compose Navigation, typed routes, nested graphs, and passing arguments safely.',
    mistakes: 'Stringly-typed routes without arguments validation, or storing NavController in ViewModel.',
    tips: 'Compare single-Activity Compose nav vs Fragment Navigation. Mention deep link handling.',
  },
  {
    topic: 'Side effects',
    evaluates: 'LaunchedEffect, DisposableEffect, SideEffect, and rememberCoroutineScope for event-driven work.',
    mistakes: 'LaunchedEffect without proper keys causing restart loops, or collecting Flow without lifecycle awareness.',
    tips: 'Use collectAsStateWithLifecycle for Flow. LaunchedEffect(Unit) for one-shot API load.',
  },
] as const

export const ANDROID_SYSTEM_DESIGN_EXAMPLES = [
  {
    title: 'Chat App',
    cover: 'Real-time messaging, message ordering, offline queue, read receipts, media upload, and push notifications via FCM.',
    points: [
      'WebSocket or Firebase Realtime Database vs REST polling trade-offs.',
      'Local Room cache with optimistic UI and sync conflict resolution.',
      'Pagination for chat history and image compression before upload.',
    ],
  },
  {
    title: 'Offline Notes App',
    cover: 'CRUD with Room, sync when online, conflict merging, and search across local database.',
    points: [
      'Single source of truth in Repository — Room as cache, remote as authority.',
      'WorkManager for background sync with network constraints.',
      'Full-text search with FTS or in-memory index for small datasets.',
    ],
  },
  {
    title: 'Food Delivery App',
    cover: 'Restaurant listing, cart, order tracking, maps, and payment flow with multiple API dependencies.',
    points: [
      'Modular features: catalog, cart, orders — clean module boundaries.',
      'Live order tracking with polling vs push; map SDK integration.',
      'Handle payment WebView/ SDK and idempotent order submission.',
    ],
  },
] as const

export const ANDROID_PROJECT_DISCUSSION_TOPICS = [
  {
    area: 'Architecture decisions',
    cover: 'Why MVVM or MVI, single-Activity vs multi-Activity, module boundaries, dependency injection (Hilt/Koin), and unidirectional data flow.',
    questions: [
      'Walk me through your app architecture from UI to data layer.',
      'Why did you choose MVVM over MVI for this project?',
      'How would you add a new feature without touching unrelated modules?',
    ],
  },
  {
    area: 'API integration',
    cover: 'Retrofit setup, interceptors, auth headers, error mapping, pagination, and retry with exponential backoff.',
    questions: [
      'How did you structure Retrofit services and DTO mapping?',
      'How do you handle 401 token refresh without duplicating calls?',
      'What happens if the user navigates away mid-request?',
    ],
  },
  {
    area: 'Offline support',
    cover: 'Room as single source of truth, cache-first Repository, sync on reconnect, conflict resolution, and user-visible offline states.',
    questions: [
      'How does your app behave without network?',
      'Describe your cache invalidation and refresh strategy.',
      'Tell me about a sync bug you fixed and the root cause.',
    ],
  },
  {
    area: 'Firebase',
    cover: 'Auth, Firestore/Realtime Database, Cloud Storage, Analytics, Crashlytics, and Remote Config — when to use each vs custom backend.',
    questions: [
      'Which Firebase products did you use and why not a custom API?',
      'How do you secure Firestore rules for user-scoped data?',
      'How did Crashlytics help you fix a production issue?',
    ],
  },
  {
    area: 'Push notifications',
    cover: 'FCM token lifecycle, notification channels (Android 8+), deep links from notifications, and background vs foreground handling.',
    questions: [
      'How do you register and refresh FCM tokens?',
      'How does the user land on the correct screen from a notification tap?',
      'How do you handle data-only vs notification payloads?',
    ],
  },
  {
    area: 'Performance optimization',
    cover: 'Cold start, Baseline Profiles, RecyclerView/Compose list performance, memory leaks, ANR prevention, and Play Console vitals.',
    questions: [
      'What was your cold start time and how did you improve it?',
      'How did you fix a memory leak or ANR in production?',
      'What do Play Console vitals tell you about your release?',
    ],
  },
  {
    area: 'Testing',
    cover: 'Unit tests for ViewModel/Repository, fake implementations, UI tests for critical flows, and what you deliberately do not test.',
    questions: [
      'What is your testing pyramid for this app?',
      'How do you test a ViewModel that calls a Repository?',
      'Which flows have Espresso or Compose UI tests and why those?',
    ],
  },
] as const

export const ANDROID_RESUME_EXAMPLES = [
  {
    title: 'Performance impact',
    bad: '“Built Android app with Kotlin.”',
    good: '“Reduced cold start time 38% (2.1s → 1.3s) by lazy-init in Application, R8 optimization, and Baseline Profile — Play Console vitals crash-free rate 99.2%.”',
  },
  {
    title: 'Architecture depth',
    bad: '“Used MVVM in Android project.”',
    good: '“Shipped Kotlin MVVM app with Hilt, Room offline cache, and Retrofit — 50k+ installs; refactored monolithic Activity to single-Activity Navigation + 12 Fragments.”',
  },
  {
    title: 'Compose migration',
    bad: '“Learned Jetpack Compose.”',
    good: '“Migrated checkout flow from XML to Jetpack Compose — cut screen code 40%, improved conversion 12% A/B test; state hoisted to ViewModel with StateFlow.”',
  },
  {
    title: 'Measurable delivery',
    bad: '“Worked on REST API integration.”',
    good: '“Integrated 8 REST endpoints with Retrofit + coroutines; implemented exponential backoff retry — API failure rate dropped from 4.1% to 0.8% over 3 releases.”',
  },
] as const

export const ANDROID_ROADMAP_WEEKS = [
  {
    week: 'Week 1',
    focus: 'Android fundamentals + Kotlin',
    items: [
      'Activity lifecycle, Intents, permissions — draw lifecycle diagram from memory.',
      'Kotlin: data/sealed classes, scope functions, collections — 10 snippet exercises.',
      'Build one screen: RecyclerView list + detail navigation.',
      'Review four app components with manifest examples.',
    ],
  },
  {
    week: 'Week 2',
    focus: 'Architecture + Jetpack',
    items: [
      'MVVM + Repository pattern with ViewModel and StateFlow.',
      'Room + Retrofit end-to-end — cache-first Repository.',
      'Hilt or manual DI — inject Repository into ViewModel.',
      'WorkManager or coroutine sync for background refresh.',
    ],
  },
  {
    week: 'Week 3',
    focus: 'Coroutines + Compose',
    items: [
      'Coroutines: launch, async, Dispatchers, structured concurrency drills.',
      'Jetpack Compose: state hoisting, remember, LaunchedEffect, Navigation.',
      'Migrate one XML screen to Compose or build new feature in Compose.',
      'System design outlines: chat app + offline notes (whiteboard 30 min each).',
    ],
  },
  {
    week: 'Week 4',
    focus: 'Mocks + project polish',
    items: [
      'Expand project walkthrough — architecture, offline, metrics, Play Store link.',
      '2 timed mock technical rounds (lifecycle + MVVM deep dive).',
      'Polish resume bullets with numbers; prepare 12 expanded question answers.',
      'HR prep: salary research, cross-platform opinion, notice period story.',
    ],
  },
] as const

export const ANDROID_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/android-developer', label: 'Android Developer Questions' },
  { href: '/interview-questions/topics/android', label: 'Android Topic Questions' },
  { href: '/interview-questions/java-developer', label: 'Java Developer Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Questions' },
  { href: '/interview-questions/backend-developer', label: 'Backend Developer Questions' },
  { href: '/interview-questions/frontend-developer', label: 'Frontend Developer Questions' },
  { href: '/interview-questions/topics/sql', label: 'SQL Interview Questions' },
  { href: '/interview-questions/topics/rest-api', label: 'REST API Questions' },
  { href: '/interview-questions/topics/java', label: 'Java Interview Questions' },
  { href: '/interview-questions/android-developer#kotlin-interview-questions', label: 'Kotlin Interview Questions' },
  { href: '/interview-questions/android-developer#coroutines', label: 'Coroutines (this guide)' },
  { href: '/interview-questions/android-developer#android-architecture-flow', label: 'Android Architecture Flow' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Questions' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Interview Questions' },
  { href: '/interview-questions/companies/amazon/software-engineer', label: 'Amazon SWE Questions' },
  { href: '/interview-questions/companies/microsoft/software-engineer', label: 'Microsoft SWE Questions' },
  { href: '/interview-questions/companies/flipkart/software-engineer', label: 'Flipkart SWE Questions' },
  { href: '/interview-questions/companies/swiggy/software-engineer', label: 'Swiggy SWE Questions' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/interview-questions/companies/infosys/software-engineer', label: 'Infosys SWE Questions' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Questions' },
  { href: '/blog/overcome-interview-anxiety-mock-interviews', label: 'Mock Interview Guide' },
  { href: '/tools/question-generator/android-developer', label: 'Android Question Generator' },
] as const

export const ANDROID_DEVELOPER_QUESTIONS: readonly SeoQuestion[] = [
  {
    question: 'What are the four main components of an Android application?',
    category: 'technical',
    difficulty: 'easy',
    tip: 'Activity (UI screen), Service (background processing), BroadcastReceiver (system/app events), ContentProvider (shared data). Each is declared in AndroidManifest.xml.',
    keywords: ['Activity', 'Service', 'BroadcastReceiver', 'ContentProvider', 'AndroidManifest'],
    evaluates: 'Whether you can map each component to real scenarios and explain manifest registration — not just list names.',
    strategy: 'Name all four, give one-line purpose each, then pick one scenario (“music playback → Service”) and explain why others do not fit.',
    mistakes: 'Listing components without manifest context, or confusing Service with WorkManager use cases.',
    followUps: ['When would you use WorkManager instead of a Service?', 'What is an exported component and why does it matter on Android 12+?'],
  },
  {
    question: 'Explain the Android Activity lifecycle. When is onStop called vs onPause?',
    category: 'technical',
    difficulty: 'easy',
    tip: 'onPause: partially obscured. onStop: fully hidden. onDestroy: destroyed. Save lightweight state in onPause; use ViewModel for data surviving rotation.',
    keywords: ['onCreate', 'onResume', 'onPause', 'onStop', 'onDestroy', 'lifecycle'],
    evaluates: 'Lifecycle ordering, config changes vs finishing, and where to persist state.',
    strategy: 'Draw the diagram. Contrast dialog overlay (onPause only) vs new Activity covering yours (onPause + onStop). Mention ViewModel vs onSaveInstanceState.',
    mistakes: 'Saving large objects in onSaveInstanceState, or doing heavy work in onCreate on every rotation.',
    followUps: ['What happens to your Activity on low memory kill?', 'How does Process Death differ from rotation?'],
  },
  {
    question: 'What is the difference between Fragment and Activity?',
    category: 'technical',
    difficulty: 'easy',
    tip: 'Activity = standalone screen host. Fragment = modular UI section inside Activity. Navigation Component manages fragment back stack.',
    keywords: ['Fragment', 'Activity', 'FragmentManager', 'Navigation Component'],
    evaluates: 'Modular UI reasoning and single-Activity architecture familiarity.',
    strategy: 'Define both, explain host relationship, mention tablet dual-pane vs phone single-pane, and Navigation back stack.',
    mistakes: 'Saying Fragments are “deprecated” because of Compose — they remain central in many codebases.',
    followUps: ['What is a Fragment lifecycle relative to Activity?', 'When would you choose single-Activity architecture?'],
  },
  {
    question: 'What are Jetpack components? Name and explain three commonly used ones.',
    category: 'technical',
    difficulty: 'medium',
    tip: 'ViewModel, Room, Navigation, WorkManager, DataStore — pick three you have used in projects with concrete examples.',
    keywords: ['ViewModel', 'Room', 'Navigation', 'Jetpack', 'LiveData'],
    evaluates: 'Production familiarity with modern Android stack beyond Activities and XML.',
    strategy: 'Pick ViewModel + Room + Navigation. For each: problem it solves, one API, one pitfall.',
    mistakes: 'Naming libraries without explaining lifecycle or threading integration.',
    followUps: ['ViewModel vs AndroidViewModel?', 'Room vs SQLiteOpenHelper — why migrate?'],
  },
  {
    question: 'What are Kotlin coroutines? How do they differ from threads?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'Lightweight cooperative concurrency; suspend without blocking thread. viewModelScope.launch with Dispatchers.IO for network.',
    keywords: ['coroutines', 'suspend', 'Dispatchers', 'viewModelScope'],
    evaluates: 'Structured concurrency basics and dispatcher choice for Android workloads.',
    strategy: 'Contrast thread cost vs coroutine scheduling. Trace one network call: launch → withContext(IO) → Main state update.',
    mistakes: 'Using GlobalScope, or blocking Main with runBlocking.',
    followUps: ['Explain async vs launch.', 'What happens when viewModelScope is cancelled?'],
  },
  {
    question: 'What is RecyclerView? How does the ViewHolder pattern improve performance?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'Recycles item views on scroll. ViewHolder caches findViewById once per row type instead of every bind.',
    keywords: ['RecyclerView', 'ViewHolder', 'Adapter', 'LayoutManager'],
    evaluates: 'List UI performance intuition — still common in legacy and hybrid codebases.',
    strategy: 'Explain recycling pool, ViewHolder role, DiffUtil for efficient updates, and stable IDs if asked.',
    mistakes: 'Calling notifyDataSetChanged for every small change instead of DiffUtil.',
    followUps: ['DiffUtil vs notifyItemRangeChanged?', 'How would you paginate with Paging 3?'],
  },
  {
    question: 'Tell me about the Android app you are most proud of. What was the hardest technical problem you solved?',
    category: 'behavioral',
    difficulty: 'medium',
    tip: 'STAR format: specific challenge (offline sync, ANR, leak), your action, measurable outcome. Mention architecture.',
    keywords: ['MVVM', 'portfolio', 'impact', 'technical challenge'],
    evaluates: 'Ownership, depth, and reflection — not resume recitation.',
    strategy: '2-minute story: problem → constraints → architecture decision → result metric → one lesson learned.',
    mistakes: 'Team-only stories with no “I,” or no numbers/outcome.',
    followUps: ['What would you refactor today?', 'How did you test that fix?'],
  },
  {
    question: 'Your app crashes on Android 6 but works fine on Android 12. How do you debug?',
    category: 'situational',
    difficulty: 'hard',
    tip: 'Check runtime permissions (API 23), API availability, and minSdk gaps. Stack trace usually names missing permission or API.',
    keywords: ['runtime permissions', 'API 23', 'minSdkVersion', 'backward compatibility'],
    evaluates: 'Systematic debugging across API levels — common in India’s fragmented device market.',
    strategy: 'Reproduce on API 23 emulator → read stack trace → check permissions → check Build.VERSION guards → Play Console vitals.',
    mistakes: 'Blaming “old Android” without reading stack trace or testing on matching API emulator.',
    followUps: ['How do you test backward compatibility in CI?', 'What is AndroidX and why use it?'],
  },
  {
    question: 'How do you ensure backward compatibility in your Android apps?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'AndroidX, minSdk checks, @RequiresApi, version-gated code paths, test matrix on emulators.',
    keywords: ['AndroidX', 'minSdkVersion', 'compatibility', 'Jetpack'],
    evaluates: 'Release discipline for diverse OEM/API mix in India.',
    strategy: 'Cover AndroidX backports, lint @RequiresApi, compatibility library versions, and Firebase/Test Lab matrix.',
    mistakes: 'Targeting latest SDK only in dev without minSdk emulator testing.',
    followUps: ['How do you handle deprecated APIs?', 'What is desugaring?'],
  },
  {
    question: 'What is onSaveInstanceState? When is it called and what should you save in it?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'Before destroy for config change/process death. Save small UI state only — scroll position, text fields. Large data → ViewModel/Room.',
    keywords: ['onSaveInstanceState', 'Bundle', 'ViewModel', 'process death'],
    evaluates: 'State restoration strategy across rotation and process death.',
    strategy: 'Contrast ViewModel (survives rotation) vs saved state (process death). Give examples of what belongs in each.',
    mistakes: 'Putting bitmaps or large lists in Bundle.',
    followUps: ['SavedStateHandle in ViewModel?', 'How does Compose rememberSaveable relate?'],
  },
  {
    question: 'What is the difference between Intent and PendingIntent?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'Intent = immediate. PendingIntent = token for system/another app to fire later (notifications, alarms) with your permissions.',
    keywords: ['Intent', 'PendingIntent', 'Notification', 'AlarmManager'],
    evaluates: 'Component communication and system integration patterns.',
    strategy: 'Define both, give notification action example, mention immutable PendingIntent flag on Android 12+.',
    mistakes: 'Using explicit Intent where PendingIntent is required for background start restrictions.',
    followUps: ['Implicit vs explicit Intent?', 'Deep links with App Links?'],
  },
  {
    question: 'Native Android vs Flutter vs React Native — which do you prefer for a new project and why?',
    category: 'hr',
    difficulty: 'easy',
    tip: 'Native: performance, full API, largest Android job market in India. Flutter/RN: shared codebase trade-offs. Align with your experience.',
    keywords: ['native Android', 'Flutter', 'React Native', 'cross-platform'],
    evaluates: 'Pragmatic trade-off thinking without fanboy answers.',
    strategy: 'State criteria: team skills, performance needs, SDK access, time-to-market. Pick one with justified context.',
    mistakes: 'Dismissive “Flutter is always better” without nuance.',
    followUps: ['When would you embed Flutter in existing native app?', 'Kotlin Multiplatform opinion?'],
  },
] as const

export const ANDROID_FAQ_ITEMS = [
  {
    question: 'How many rounds are in a typical Android Developer interview in India?',
    answer: 'Most loops have 4–6 stages after resume screening: online assessment, 1–2 technical Android rounds, project discussion, and HR. Product companies may add a system design or architecture round; service firms often emphasize OA DSA and Core Java/Kotlin.',
  },
  {
    question: 'Is Kotlin mandatory for Android interviews in 2026?',
    answer: 'Kotlin is the default for new Android development and most panels expect Kotlin-first answers. Java knowledge still helps for legacy codebases and OA MCQs, but lead with Kotlin idioms, coroutines, and Jetpack in technical rounds.',
  },
  {
    question: 'Do I need Jetpack Compose for Android interviews?',
    answer: 'Compose is increasingly asked at product companies and startups. You should understand recomposition, state hoisting, and Navigation even if your portfolio is XML-based — mention migration plans or hybrid screens if asked.',
  },
  {
    question: 'How much DSA is required for Android Developer roles?',
    answer: 'OA rounds often test arrays, strings, hash maps, and easy–medium LeetCode. Technical rounds focus more on Android, Kotlin, and architecture, but strong DSA helps at Amazon, Flipkart, and Microsoft mobile-adjacent loops.',
  },
  {
    question: 'What Android projects should I put on my resume?',
    answer: 'One polished app beats five tutorials. Include Play Store or GitHub link, architecture (MVVM), offline/Room, REST integration, and one metric: installs, crash-free rate, or performance improvement.',
  },
  {
    question: 'How do I prepare for Android system design interviews?',
    answer: 'Practice whiteboarding chat, offline notes, and food delivery apps. Cover API design, local cache, sync, push notifications, modularization, and scalability — mobile system design is lighter than backend but tests data flow and offline UX.',
  },
  {
    question: 'What is the salary range for Android Developers in India in 2026?',
    answer: 'Freshers typically see 4–8 LPA at service firms and 8–14 LPA at product companies. With 2–4 years, product roles often reach 12–22 LPA depending on city, company, and Compose/architecture depth.',
  },
  {
    question: 'Should I learn MVVM or MVI for interviews?',
    answer: 'MVVM is the most common interview expectation — ViewModel, Repository, StateFlow/LiveData. MVI is a plus at some product companies. Know unidirectional data flow in either pattern.',
  },
  {
    question: 'How important are coroutines compared to RxJava?',
    answer: 'Coroutines are the modern default in Kotlin Android codebases. Understand launch, async, suspend, Dispatchers, and cancellation. RxJava may appear in legacy apps — mention interoperability if you have seen it.',
  },
  {
    question: 'What should I demo in the project discussion round?',
    answer: 'Open your app live, walk architecture diagram (UI → ViewModel → Repository → Room/Retrofit), explain one bug you fixed, one performance win, and how you handle offline or errors. Keep it under 5 minutes before Q&A.',
  },
  {
    question: 'Are Android certifications worth it for interviews?',
    answer: 'Google Associate Android Developer certificate validates fundamentals but rarely replaces portfolio and interview performance. Prioritize a shipped app, clean architecture, and mock interviews over certification-only prep.',
  },
  {
    question: 'How long should I prepare for Android interviews?',
    answer: 'A focused 4-week plan works if you already know Java basics: Week 1 fundamentals + Kotlin, Week 2 MVVM + Jetpack, Week 3 coroutines + Compose + system design, Week 4 mocks and resume polish. Extend to 8 weeks if starting from zero.',
  },
] as const

export function isAndroidDeveloperHub(roleSlug: string): boolean {
  return roleSlug === 'android-developer'
}

/**
 * Audit status (2026-06-06):
 * PRODUCTION READY — hero (priority), process + roadmap images (lazy), sticky TOC, architecture flow + principles,
 * Android project discussion (7 areas), E-E-A-T aside, 23 contextual internal links, expanded question cards.
 * SEO READY — self-canonical, index/follow, Article/FAQPage/BreadcrumbList/ItemList/@graph JSON-LD
 * (WebSite, Organization, WebPage, Article, Person author + reviewer, ImageObject ×4).
 * INDEXING READY — isRoleIndexable(android-developer); questions-sitemap lastModified 2026-06-06; IndexNow eligible.
 */
