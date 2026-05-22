/**
 * STAR behavioral interview topic definitions for /tools/star-builder/[topic] pages.
 *
 * Each topic captures a specific behavioral interview scenario with:
 * - A pre-rendered sample STAR answer (the primary SEO content differentiator)
 * - Preparation tips unique to that question type
 * - Related topic slugs for internal linking
 *
 * Adding a new topic:
 * 1. Append an entry to STAR_TOPICS.
 * 2. The slug automatically joins the StarTopicSlug union.
 * 3. The page at /tools/star-builder/[slug] is statically generated.
 */

export interface StarSampleAnswer {
  readonly situation: string
  readonly task: string
  readonly action: string
  readonly result: string
}

export interface StarTopicDefinition {
  readonly slug: string
  readonly label: string
  /** The behavioral question interviewers commonly ask for this topic. */
  readonly questionPrompt: string
  /** 1–2 sentence meta description. */
  readonly description: string
  readonly sitemapPriority: number
  /** Pre-rendered example answer for the SEO page. */
  readonly sampleAnswer: StarSampleAnswer
  /** 3–4 preparation tips specific to this question type. */
  readonly tips: readonly string[]
  /** Slugs of related topics for internal linking. */
  readonly relatedTopics: readonly string[]
}

export const STAR_TOPICS = [
  {
    slug: 'team-conflict',
    label: 'Team Conflict',
    questionPrompt: 'Tell me about a time you had a conflict with a team member.',
    description: 'Structure your answer about resolving team conflict using the STAR method — with a pre-rendered example and scoring tips.',
    sitemapPriority: 0.82,
    sampleAnswer: {
      situation: 'During my final-year project, our four-person team disagreed on the backend stack — two members wanted Node.js and two, including me, believed Python/FastAPI was better suited given our ML data pipeline.',
      task: 'As the informal tech lead, I needed to resolve the disagreement fairly and quickly before it delayed our sprint planning, which was scheduled for the following morning.',
      action: 'I proposed a 45-minute "tech spike" that same evening where we evaluated both options against three agreed criteria: team familiarity, ML library support, and free-tier deployment cost. I prepared a one-page comparison doc so the debate stayed data-driven. After reviewing the results together, the team voted unanimously for Python.',
      result: 'We launched on schedule with no further stack debate. The ML integration took three days instead of the week we had budgeted, freeing time for a better UI. The team later said the structured evaluation approach was one of the most valuable things they took into their careers.',
    },
    tips: [
      'Never frame the other person as simply wrong — present it as two valid perspectives on the same problem.',
      'Show your resolution was process-driven, not personality-driven. Frameworks, data, or agreed criteria make the story credible.',
      'End with mutual benefit — the strongest STAR conflict answers show both parties gained something.',
      'Keep the conflict professional and scoped: a technical or approach disagreement lands better than an interpersonal drama.',
    ],
    relatedTopics: ['disagreement-with-manager', 'collaboration', 'difficult-decision'],
  },
  {
    slug: 'tight-deadline',
    label: 'Tight Deadline',
    questionPrompt: 'Describe a time you worked under extreme time pressure to deliver something.',
    description: 'Use the STAR method to answer questions about delivering under tight deadlines — structured example included.',
    sitemapPriority: 0.81,
    sampleAnswer: {
      situation: 'Three days before our product launch, a security audit flagged a critical SQL injection vulnerability in our search endpoint that had to be patched before we could go live.',
      task: 'I was the only backend engineer available that weekend. I needed to patch the vulnerability, write regression tests, get the fix reviewed, and deploy to production — all within 48 hours.',
      action: 'I immediately reproduced the vulnerability in a local environment to understand its scope. I parameterised all raw query strings using the ORM\'s prepared statement API, then wrote a suite of 12 unit tests covering boundary inputs. I pinged two colleagues on Slack for a lightweight async code review to avoid a blind spot, incorporated their feedback in 30 minutes, and deployed via our CI pipeline after all checks passed.',
      result: 'The patch was live 31 hours after I started — 17 hours ahead of deadline. The security team re-ran their scan and cleared us for launch. The product launched on schedule with zero security incidents in the first 90 days.',
    },
    tips: [
      'Quantify the pressure — "48-hour window," "three days before launch" — context makes the accomplishment land.',
      'Show your decision-making process: what you de-prioritised, what shortcuts you explicitly refused to take (like skipping tests).',
      'Mention who you brought in — working fast alone can look reckless; working fast with appropriate checkpoints looks professional.',
      'Close with the outcome metric, not just "we delivered on time." What was the actual business or quality result?',
    ],
    relatedTopics: ['crisis-management', 'prioritization', 'resilience'],
  },
  {
    slug: 'leadership',
    label: 'Leadership',
    questionPrompt: 'Tell me about a time you led a project or team without formal authority.',
    description: 'Craft a compelling STAR answer about leadership — with a pre-rendered example for tech and engineering interviews.',
    sitemapPriority: 0.83,
    sampleAnswer: {
      situation: 'My college technical fest committee had a team of twelve volunteers to build a real-time leaderboard for a coding competition, but there was no assigned project lead and the event was six weeks away.',
      task: 'I saw that without coordination, each person was building something different. I stepped up to lead the effort — not because I was asked to, but because I could see the project was heading for chaos.',
      action: 'I ran a kickoff meeting to align on tech stack (React + Firebase Realtime Database) and broke the work into four parallel streams. I set up a Trello board, scheduled weekly 20-minute syncs, and made myself available on WhatsApp for blockers. When two members fell behind, I reassigned tasks based on bandwidth rather than original plan, and pair-programmed with one of them to unblock a tricky auth integration.',
      result: 'We shipped the leaderboard three days early. It handled 1,200 concurrent viewers with no downtime during the event. Three of the twelve volunteers asked me to lead their next project. The faculty advisor cited it as the best technical execution in four years of the fest.',
    },
    tips: [
      'Clarify that it was informal leadership — "without formal authority" is a distinct and valuable quality companies test for.',
      'Show how you handled resistance or disengagement — true leadership stories always have at least one friction point.',
      'Demonstrate that you delegated strategically, not just assigned tasks. Explain why you matched specific people to specific work.',
      'Include a "what I learned about leading people" line — growth mindset language elevates the answer.',
    ],
    relatedTopics: ['mentoring', 'initiative', 'collaboration'],
  },
  {
    slug: 'failure-learning',
    label: 'Failure & Learning',
    questionPrompt: 'Tell me about your biggest professional or academic failure and what you learned.',
    description: 'Structure your failure story with the STAR method — pre-rendered example shows how to turn setbacks into compelling answers.',
    sitemapPriority: 0.84,
    sampleAnswer: {
      situation: 'During an internship, I was assigned to run a database migration that would consolidate two legacy tables into one. I tested it thoroughly in staging but underestimated the difference in dataset size between staging and production.',
      task: 'I executed the migration during a scheduled maintenance window. My job was to ensure zero data loss and a rollback plan if anything went wrong.',
      action: 'The migration ran fine in staging but timed out in production after 40 minutes, locking the table and bringing down the payment confirmation feature for 22 minutes. I immediately rolled back using the backup snapshot, communicated the impact clearly to my manager in Slack within five minutes of the outage, and prepared a post-mortem the next day outlining three root causes: no production-scale dry run, no row-count comparison check, and no circuit breaker on the migration query.',
      result: 'The 22-minute outage affected 340 transactions, all of which were successfully retried. I implemented the post-mortem recommendations before re-running the migration the following week — this time in batches of 10,000 rows, which completed in 8 minutes with zero downtime. My manager said the post-mortem was one of the best she had seen from an intern.',
    },
    tips: [
      'Choose a real, professionally meaningful failure — not a humble-brag disguised as a weakness. Interviewers can tell.',
      'Own the failure completely: no passive voice, no blame-shifting. "I underestimated" is stronger than "the process wasn\'t clear."',
      'The learning must be specific and demonstrable — show you actually changed your behaviour, not just that you "reflected."',
      'Limit the failure to one that is bounded in scope. A company-wide catastrophe is too big; a small individual mistake is too trivial.',
    ],
    relatedTopics: ['resilience', 'difficult-decision', 'crisis-management'],
  },
  {
    slug: 'initiative',
    label: 'Initiative & Going Beyond',
    questionPrompt: 'Describe a time you went above and beyond what was expected of you.',
    description: 'Build a compelling STAR answer about taking initiative — pre-rendered example for engineering and tech interviews.',
    sitemapPriority: 0.80,
    sampleAnswer: {
      situation: 'During my internship, I noticed that our QA team spent four hours every Friday manually running the same 60 regression tests on three environments before each release.',
      task: 'My assigned work was front-end bug fixes. Automating the QA pipeline was not in my scope, but the manual overhead was visibly hurting team morale and delaying releases by half a day each week.',
      action: 'I proposed the automation to my manager, got a one-sentence approval, and spent three evenings building a Selenium test suite that replicated all 60 tests. I containerised it with Docker so any team member could run it locally, and integrated it into the GitHub Actions CI pipeline so it ran automatically on every PR to the main branch.',
      result: 'The Friday manual regression was eliminated permanently. Releases moved to Thursday evenings, shortening the release cycle by 20%. My manager presented the automation to the CTO as a team win. I received a return offer for the following summer.',
    },
    tips: [
      'Make the "beyond scope" boundary explicit — say clearly what you were asked to do versus what you chose to do additionally.',
      'Show your initiative was approved or communicated, not unilateral. A one-line manager approval makes it look collaborative, not cowboy.',
      'Quantify the recurrence benefit: one-time effort that saves time every week is more compelling than a single large heroic act.',
      'Avoid stories where you stayed late just to finish your own assigned work — that\'s effort, not initiative.',
    ],
    relatedTopics: ['process-improvement', 'innovation', 'goal-achievement'],
  },
  {
    slug: 'difficult-decision',
    label: 'Difficult Decision',
    questionPrompt: 'Tell me about a difficult decision you had to make under uncertainty.',
    description: 'Use STAR to structure your answer about difficult decisions — with a real example and preparation tips for behavioural interviews.',
    sitemapPriority: 0.80,
    sampleAnswer: {
      situation: 'Three weeks before a client demo, we discovered that our chosen third-party map API had a per-request pricing model that would cost ₹3.2L/month at projected scale — three times our infrastructure budget.',
      task: 'As the technical lead, I had to decide whether to build an in-house mapping layer (high effort, two weeks minimum), switch to an alternative API (unknown reliability, limited time to integrate), or descope the map feature entirely for the demo.',
      action: 'I evaluated all three options against four criteria: timeline risk, cost, feature completeness, and client satisfaction impact. I consulted our PM and a senior engineer. I also reached out to the alternative API vendor and ran a 4-hour proof-of-concept to stress-test reliability. The PoC showed adequate performance. I presented the analysis to the team in a 15-minute decision meeting and recommended Option 2, with a two-day contingency buffer if the integration hit blockers.',
      result: 'The alternative API integration was completed in six days with no major issues. The feature shipped for the demo. Client satisfaction was high, and we avoided the ₹3.2L/month cost. The decision framework I used was adopted by the team for future architecture choices.',
    },
    tips: [
      'Describe your decision framework explicitly: what criteria you used, what data you gathered, and who you consulted.',
      'Include the path not taken and why you rejected it — this shows analytical depth, not just outcome luck.',
      'Acknowledge the uncertainty: "I had 70% confidence this would work" is more credible than "I knew it was the right call."',
      'If the decision led to a suboptimal outcome, own it and explain what you would do differently — honesty about imperfect decisions is impressive.',
    ],
    relatedTopics: ['ambiguity', 'failure-learning', 'prioritization'],
  },
  {
    slug: 'ambiguity',
    label: 'Working with Ambiguity',
    questionPrompt: 'Describe a time you had to deliver results with incomplete or unclear requirements.',
    description: 'STAR method answer for ambiguity questions — pre-rendered example for product and engineering interviews.',
    sitemapPriority: 0.79,
    sampleAnswer: {
      situation: 'Mid-sprint, our PM went on emergency leave, leaving a half-written spec for a new user onboarding flow. The stakeholder review was in five days and no one else had full context on the business requirements.',
      task: 'I needed to either unblock the frontend team with enough spec clarity to continue building, or escalate to engineering management to reprioritise the sprint — without knowing what "acceptable" looked like from the business side.',
      action: 'I read all available context: the PM\'s draft spec, related Jira tickets, and a 10-minute Loom recording she had left. I identified three decision points where the spec was ambiguous and documented explicit assumptions for each. I shared these assumptions with the product director in a Slack message asking for a yes/no confirmation on each. Within two hours, I had confirmations on two of three points and a 15-minute call scheduled to resolve the third. I briefed the frontend team on the confirmed requirements and held the third screen in backlog.',
      result: 'The team delivered four of five screens by the stakeholder review. The fifth was demoed as a wireframe with a confirmed timeline. The product director noted that my written assumptions document prevented a misalignment that had cost the team two full sprints the previous quarter.',
    },
    tips: [
      'Show you clarified — didn\'t just guess. Document what you assumed and seek rapid confirmation rather than building on unknowns.',
      'Describe how you triaged: which ambiguities blocked progress and which you could move forward despite.',
      'Demonstrate stakeholder communication: how you surfaced the ambiguity without creating alarm or stopping work entirely.',
      'End with a process improvement: "I now create an assumptions log at the start of every sprint to prevent this."',
    ],
    relatedTopics: ['difficult-decision', 'prioritization', 'stakeholder-management'],
  },
  {
    slug: 'process-improvement',
    label: 'Process Improvement',
    questionPrompt: 'Tell me about a time you identified and improved an inefficient process.',
    description: 'Craft your process improvement STAR answer — with a pre-rendered example and tips for engineering and analyst interviews.',
    sitemapPriority: 0.79,
    sampleAnswer: {
      situation: 'At my internship, every new API endpoint required a developer to manually write a Postman collection, which often took 2–3 hours per endpoint and frequently went out of date within a week because updates weren\'t reflected.',
      task: 'I was responsible for documenting our team\'s internal APIs — a task that occupied most of one day per week and was universally disliked because the docs were stale almost immediately.',
      action: 'I investigated alternatives and found that our FastAPI framework could auto-generate an OpenAPI spec from code annotations. I wrote a script that exported the spec to Postman format and committed it alongside code on every PR. I documented the three-line setup in a wiki page and demoed it to the team in a 10-minute Slack Huddle. I then retroactively added annotations to the 14 existing endpoints over two evenings.',
      result: 'API documentation time dropped from ~10 hours/week across the team to near zero — it was now automatic. The collections were always up to date with the code. My manager cited this as a team-wide quality improvement in my internship feedback and nominated me for the "proactive contributor" award.',
    },
    tips: [
      'Quantify the before state: how many hours, how many errors, how often the old process failed — make the waste visible.',
      'Show you didn\'t just solve your own pain point — you implemented a solution that helped the whole team or org.',
      'Describe the adoption step: a good process improvement that nobody uses is a failed process improvement.',
      'Include a metric for the after state: "reduced from X to Y" is far stronger than "significantly improved."',
    ],
    relatedTopics: ['initiative', 'innovation', 'collaboration'],
  },
  {
    slug: 'stakeholder-management',
    label: 'Stakeholder Management',
    questionPrompt: 'Describe a time you managed competing priorities from different stakeholders.',
    description: 'STAR answer template for stakeholder management questions — example for product and engineering interviews.',
    sitemapPriority: 0.79,
    sampleAnswer: {
      situation: 'During a two-week sprint, the sales team escalated a request to add a bulk export feature "urgently" for a large enterprise prospect, while the product team had already committed to delivering a dashboard redesign that the engineering team had been blocked on for two months.',
      task: 'As the frontend tech lead, I was caught between two valid, high-urgency priorities. I needed to make a recommendation that protected the committed timeline without losing the enterprise deal.',
      action: 'I requested a 30-minute tripartite call with the PM and the sales director. Before the call, I estimated the export feature at four days of frontend work and quantified the cost of delaying the dashboard: three blocked engineers plus a customer support escalation. During the call, I proposed a middle path: we would implement a CSV export in one day using an existing data endpoint (not the full bulk export), which would satisfy the demo requirement. The full bulk export would be scheduled for the next sprint. I documented the agreement and sent it to all three parties.',
      result: 'The enterprise deal advanced to the next stage using the minimal CSV export. The dashboard shipped on time. Both stakeholders expressed appreciation for the transparent trade-off analysis. The full bulk export shipped in Sprint+1 as committed.',
    },
    tips: [
      'Show you sought data before choosing sides — stakeholder management is about trade-off visibility, not picking a winner.',
      'Demonstrate that your solution addressed both stakeholders\' underlying needs, not just their stated requests.',
      'Describe how you documented and communicated the outcome — alignment without written confirmation often evaporates.',
      'Avoid framing one stakeholder as unreasonable — sophisticated interviewers will probe this and it makes you look reactive.',
    ],
    relatedTopics: ['prioritization', 'difficult-decision', 'collaboration'],
  },
  {
    slug: 'customer-focus',
    label: 'Customer Focus',
    questionPrompt: 'Tell me about a time you went out of your way to resolve a customer or user problem.',
    description: 'STAR method example for customer focus and customer obsession questions — perfect for product and service role interviews.',
    sitemapPriority: 0.78,
    sampleAnswer: {
      situation: 'During my internship, I noticed through support tickets that five enterprise clients were spending 40+ minutes per week manually re-exporting a report in a specific date format because our CSV export used ISO 8601 but their systems required DD/MM/YYYY.',
      task: 'This wasn\'t in my sprint backlog. My assigned work was a separate analytics feature. But the support tickets showed real user frustration and a simple root cause.',
      action: 'I built a date format selector (ISO / DD-MM-YYYY / MM-DD-YYYY) into the export flow in one evening, added it to our feature flag system for beta testing, and released it to the five affected clients first. I personally followed up with each client via their CSM to confirm the fix worked. I then monitored support tickets for two weeks to ensure no new format-related issues arose.',
      result: 'All five clients confirmed the fix eliminated their manual workaround. Support tickets for date format issues dropped to zero. One client expanded their contract three months later, and their CSM specifically cited our responsiveness to their feedback as a factor.',
    },
    tips: [
      'Customer focus means proactively identifying pain even when not assigned to fix it — show you noticed the problem yourself.',
      'Quantify the customer pain in time, money, or frustration before showing the solution.',
      'Include a follow-up step: confirming the fix worked directly with the customer is what separates good from great customer focus.',
      'If you can tie the outcome to a business metric (retention, expansion, NPS), do it — it shows you understand the commercial dimension.',
    ],
    relatedTopics: ['initiative', 'process-improvement', 'stakeholder-management'],
  },
  {
    slug: 'technical-challenge',
    label: 'Technical Challenge',
    questionPrompt: 'Describe the most technically challenging problem you have solved.',
    description: 'Build a compelling STAR answer for technical challenge questions — example and preparation tips for engineering interviews.',
    sitemapPriority: 0.83,
    sampleAnswer: {
      situation: 'In production, our order-processing service was dropping about 0.3% of orders under peak load — roughly 180 lost orders per day. The issue was intermittent and only reproducible at traffic levels we couldn\'t easily simulate in staging.',
      task: 'I was assigned to diagnose and fix the root cause within one sprint. The team had been investigating for three weeks without finding it, and the issue was escalating to senior management because of customer impact.',
      action: 'I added fine-grained metrics to every step of the order processing pipeline and deployed to production, which is where the issue only appeared. Within 24 hours, I had data showing that the drop correlated with database connection pool exhaustion, not message queue failures as previously suspected. I traced this to a slow query in the inventory reservation step that held connections open for 2–4 seconds under load. I rewrote it as an indexed, non-locking query and added a connection pool size alert at 80% utilisation. I tested the fix against a production traffic replay before deploying.',
      result: 'Order drop rate fell from 0.3% to 0.002% (within normal background noise) within 48 hours of deployment. The fix also reduced average order processing latency from 340ms to 89ms. The database connection pool alert has fired twice since, allowing us to proactively scale before any user impact.',
    },
    tips: [
      'Describe your systematic debugging approach — not lucky guessing. Walk through what you measured, what you found, and what you changed.',
      'Name the specific technical root cause clearly — vague descriptions like "performance issue" are much weaker than "connection pool exhaustion caused by a non-indexed query."',
      'Show you validated the fix with data, not intuition — this matters especially for production changes.',
      'Include a prevention step: what monitoring or structural change ensures this class of problem is caught earlier in future.',
    ],
    relatedTopics: ['crisis-management', 'failure-learning', 'process-improvement'],
  },
  {
    slug: 'new-technology',
    label: 'Learning New Technology',
    questionPrompt: 'Tell me about a time you had to learn a new technology quickly to complete a project.',
    description: 'STAR method example for learning agility questions — structured template for tech and software engineering interviews.',
    sitemapPriority: 0.80,
    sampleAnswer: {
      situation: 'Midway through a college project, the team decided to migrate our backend from a monolithic Flask app to a containerised microservices architecture on Kubernetes — a technology none of us had used in production.',
      task: 'I volunteered to lead the infrastructure side, which meant learning Kubernetes, Docker Compose for local dev, and Helm charts well enough to design and deploy our architecture in under two weeks alongside my other coursework.',
      action: 'I used a deliberate learning strategy: I spent the first two days on the official Kubernetes docs and KodeKloud labs to build a conceptual model, then immediately applied each concept to our actual codebase rather than toy examples. I set up a minikube cluster locally to experiment with zero cost. When I got stuck on ingress configuration, I asked a specific, well-scoped question on the Kubernetes Slack community and got an answer within the hour. By day eight, I had a working deployment manifests set for three services.',
      result: 'Our three microservices were deployed and running on a local k3s cluster within 11 days. The project received top marks, with the evaluator specifically praising the architecture choices. I now maintain the Kubernetes deployment config for two open-source side projects.',
    },
    tips: [
      'Show your learning strategy, not just the outcome — interviewers want to know how you learn, not that you eventually figured it out.',
      'Name specific resources and explain why you chose them — "official docs + hands-on project" is more credible than "YouTube videos."',
      'Include how you handled being stuck — reaching out appropriately for help is a sign of good engineering judgment, not weakness.',
      'End with evidence of durable learning: a project you still maintain, a certification you earned, or a concept you later taught someone else.',
    ],
    relatedTopics: ['initiative', 'ambiguity', 'resilience'],
  },
  {
    slug: 'disagreement-with-manager',
    label: 'Disagreement with Manager',
    questionPrompt: 'Describe a time you disagreed with your manager and how you handled it.',
    description: 'STAR answer for disagreeing with a manager — example and tips for engineering and professional role interviews.',
    sitemapPriority: 0.81,
    sampleAnswer: {
      situation: 'My manager wanted to skip unit tests for a new payment feature to meet a tight client deadline, reasoning that we would add tests "in the next sprint." Based on past experience with our codebase, I strongly disagreed.',
      task: 'I needed to push back on a decision made by someone with direct authority over my performance review, without being obstructive or damaging our working relationship.',
      action: 'I requested a 15-minute private conversation rather than raising the disagreement in the sprint planning meeting. I came prepared with data: the last three instances where we shipped untested payment code, two resulted in critical bugs within two weeks that cost more time to fix than the tests would have taken. I also offered a specific compromise: I would write minimal unit tests for the three highest-risk functions only (estimated 4 hours), which would catch 90% of likely regressions without impacting the deadline materially. I presented this as a risk-based proposal, not an objection.',
      result: 'My manager agreed to the compromise. The feature shipped on time with three hours of test coverage. No payment bugs were reported in the following month. My manager later cited the conversation as an example of constructive technical pushback in a team retro.',
    },
    tips: [
      'Private, not public: disagreements with managers land much better when they are raised in a 1:1, not a group meeting.',
      'Lead with data, not opinion. "The last three times we did this, it cost us two weeks" is far more persuasive than "I think this is risky."',
      'Offer a specific compromise — "here is a path that addresses both our concerns" is the hallmark of a constructive disagreement.',
      'Show you accepted the decision gracefully even when your view wasn\'t fully adopted — "disagree and commit" is a valued professional trait.',
    ],
    relatedTopics: ['team-conflict', 'difficult-decision', 'stakeholder-management'],
  },
  {
    slug: 'prioritization',
    label: 'Prioritization Under Pressure',
    questionPrompt: 'Tell me about a time you had to prioritise competing urgent tasks.',
    description: 'STAR method answer for prioritization and time management questions — example for engineering and product interviews.',
    sitemapPriority: 0.80,
    sampleAnswer: {
      situation: 'On a Monday morning, I simultaneously had three time-sensitive issues: a production bug causing login failures for 3% of users, a critical PR blocking a teammate\'s feature deployment, and a deadline to deliver a client-facing analytics report by noon.',
      task: 'All three were genuinely urgent. I had to triage quickly, communicate my decisions to stakeholders, and execute without dropping any of them.',
      action: 'I applied an impact × urgency matrix: the login failure affected live users directly (highest impact, immediate urgency) and had to come first. I spent 25 minutes diagnosing and deploying a hotfix, then posted an update in the incident channel. The blocked PR was the second priority — it took 15 minutes to review and unblock my teammate. The analytics report was time-sensitive but had a hard deadline of noon, giving me 90 minutes; I had already done 70% of the work Friday, so I completed the remaining 30% in 45 minutes. I communicated my triage reasoning to all three stakeholders in Slack before starting so none of them were in the dark.',
      result: 'All three were resolved before noon. Login failure recovery took under 30 minutes total. The teammate\'s feature shipped same day. The analytics report was delivered 20 minutes early. My manager specifically mentioned my triage communication as setting a good example for the team.',
    },
    tips: [
      'Show your decision framework explicitly — impact × urgency, MoSCoW, or simply "who is blocked by this right now?" Communication counts as much as execution.',
      'Include how you communicated your triage to affected parties — people handle delays much better when they understand why.',
      'Avoid implying you simply "worked harder" to get everything done. What did you choose to do well, what did you choose to do minimally, and why?',
      'If you had to drop or delay something, include that honestly — "I rescheduled the documentation until Tuesday, which I communicated to the PM" shows mature trade-off thinking.',
    ],
    relatedTopics: ['tight-deadline', 'stakeholder-management', 'difficult-decision'],
  },
  {
    slug: 'mentoring',
    label: 'Mentoring & Developing Others',
    questionPrompt: 'Tell me about a time you mentored or helped develop a colleague or junior team member.',
    description: 'STAR answer for mentoring questions — structured example for engineering, management, and leadership interviews.',
    sitemapPriority: 0.78,
    sampleAnswer: {
      situation: 'A first-year teammate joined the backend team with strong Python skills but struggled with writing testable, loosely-coupled code — a pattern that was causing slow PR reviews and frequent refactor requests.',
      task: 'I was asked informally by our team lead to help onboard him. My goal was to help him understand dependency injection and test-driven development without making him feel criticised or micromanaged.',
      action: 'I started with a 30-minute paired code review on one of his existing PRs, framing my comments as "here\'s a pattern that makes this kind of change easier to test" rather than "this is wrong." I then suggested we pair-program one new feature together, where I narrated my thought process aloud as I wrote. I also shared two resources: a blog post on the SOLID principles and a chapter from "Clean Code" that directly applied to our codebase. I set up an optional weekly 20-minute check-in for two months to answer questions and review his progress.',
      result: 'Within six weeks, his PRs required 60% fewer review comments related to structure. He independently refactored a critical service using the patterns we had discussed, which reduced test run time by 35%. He told me in a 1:1 that pairing was the most useful learning experience of his first year.',
    },
    tips: [
      'Focus on how you adapted your communication style to the individual — good mentoring is tailored, not generic advice delivery.',
      'Show the progression over time: one conversation isn\'t mentoring. Describe the arc from initial challenge to improved capability.',
      'Avoid centering yourself as the all-knowing guide — "we learned together" or "their question taught me X" makes the story more credible.',
      'Include a specific, observable outcome of the mentoring: a metric, a delivered project, or direct feedback from the mentee.',
    ],
    relatedTopics: ['leadership', 'collaboration', 'initiative'],
  },
  {
    slug: 'innovation',
    label: 'Creative Problem Solving',
    questionPrompt: 'Describe a time you came up with a creative or unconventional solution to a problem.',
    description: 'STAR answer for innovation and creative problem-solving questions — example for engineering and product interviews.',
    sitemapPriority: 0.79,
    sampleAnswer: {
      situation: 'Our real-time dashboard was re-fetching all 10,000 records from the database every 30 seconds to show "live" stats — consuming 40% of our DB read capacity and causing noticeable lag during peak hours.',
      task: 'I needed to reduce database load significantly without rebuilding the dashboard, which had just shipped and changing it would require design and PM alignment we didn\'t have time for.',
      action: 'Instead of the obvious solution (cache the query result for 30 seconds), I proposed an event-sourced approach: rather than pulling all records periodically, we would push only change events to a small Redis counter set whenever a transaction was created or updated. The dashboard would then fetch only the pre-aggregated counters from Redis, not the raw records. I prototyped it in four hours and benchmarked it against the existing approach. I presented the prototype to the team with both approaches side-by-side.',
      result: 'The event-sourcing approach reduced database read load by 94% and cut dashboard load time from 1.8 seconds to 180 milliseconds. Redis memory usage was under 2MB. The solution also made the dashboard more accurate — it now reflected changes within 1 second instead of 30.',
    },
    tips: [
      'Show why the "obvious" solution was insufficient and how you arrived at the creative alternative — don\'t just present the final idea as if it appeared from nowhere.',
      'Prototype before proposing at scale — showing data from a proof-of-concept is far more persuasive than a theoretical argument.',
      'Keep the solution elegant, not merely clever. "Creative" in engineering means "simple and effective in a non-obvious way," not "complicated and clever."',
      'Quantify the result with precision — specific improvement metrics validate that the creativity paid off.',
    ],
    relatedTopics: ['process-improvement', 'technical-challenge', 'initiative'],
  },
  {
    slug: 'goal-achievement',
    label: 'Goal Achievement',
    questionPrompt: 'Describe a time you set and achieved a significant goal under constraints.',
    description: 'STAR method answer for goal achievement questions — structured example for tech and business role interviews.',
    sitemapPriority: 0.78,
    sampleAnswer: {
      situation: 'I set myself the goal of landing a software engineering internship at a product company before my third year of college, despite having no prior industry experience and attending a non-IIT/NIT college where fewer companies recruited on campus.',
      task: 'I had eight months and needed to build a portfolio strong enough to compete with candidates from premier institutions who would be applying for the same roles.',
      action: 'I broke the goal into monthly milestones: months 1–2 (DSA fundamentals on LeetCode), months 3–4 (build two portfolio projects with real users), months 5–6 (open-source contributions to improve GitHub profile), months 7–8 (targeted applications + mock interviews). I completed 180 LeetCode problems, shipped a task management tool with 200 active users, and had three PRs merged into open-source projects. I applied to 40 companies, tracked responses in a spreadsheet, and iterated my resume after each rejection.',
      result: 'I received three internship offers — from Freshworks, a seed-stage startup, and a product company in Bengaluru. I accepted the Freshworks offer. My offer was cited by the recruiter as primarily driven by my GitHub activity and the open-source contributions, which differentiated me from candidates with similar academic backgrounds.',
    },
    tips: [
      'Structure the goal clearly: what specifically you were aiming for and why it was significant, not just "I worked hard."',
      'Show your planning: how did you break a large goal into measurable milestones? Interviewers are looking for goal-setting maturity, not luck.',
      'Include setbacks: a goal achievement story with no obstacles isn\'t credible. What went wrong and how did you adapt?',
      'End with a transferable insight: what you learned about setting and pursuing goals that you now apply systematically.',
    ],
    relatedTopics: ['resilience', 'initiative', 'tight-deadline'],
  },
  {
    slug: 'crisis-management',
    label: 'Crisis Management',
    questionPrompt: 'Tell me about a time you handled a crisis or a production incident.',
    description: 'STAR answer for crisis management and incident response questions — example for engineering and DevOps interviews.',
    sitemapPriority: 0.81,
    sampleAnswer: {
      situation: 'At 11:45 PM on a Friday, our primary database ran out of disk space due to an uncontrolled log table growth, taking down all write operations across our entire application — affecting approximately 8,000 active users.',
      task: 'I was the on-call engineer. I had to restore service as quickly as possible, communicate transparently with stakeholders, and prevent recurrence — all without making changes that could cause secondary failures.',
      action: 'Within five minutes of the alert firing, I confirmed the root cause using our monitoring dashboard and connected to the database host. I identified that the audit log table had grown from 40GB to 650GB in 72 hours due to a misconfigured logging verbosity deployed that Thursday. I did not delete logs blindly; I first archived them to S3 using a non-blocking copy, then truncated the table safely. Service was restored in 22 minutes. I immediately posted a status update to our incident Slack channel, emailed a brief summary to the affected enterprise client at 12:30 AM, and filed a detailed post-mortem by 9 AM Saturday covering: what happened, why the alert didn\'t fire sooner, and three specific changes to prevent recurrence.',
      result: 'Service was restored in 22 minutes with no data loss. The enterprise client responded to my email thanking me for the proactive communication. The post-mortem changes — disk usage alerting at 70% + log retention policy — were implemented the following week. No disk-related incident has occurred since.',
    },
    tips: [
      'Show methodical diagnosis under pressure: what tools you used, what you checked, in what order, and why.',
      'Communicate first, fix second — or simultaneously. Crisis management is 50% technical resolution and 50% stakeholder communication.',
      'Never skip the post-mortem — interviewers will ask "what changed after this?" A good crisis answer has a preventive tail.',
      'Avoid making the story about heroics — the best crisis responses are calm, systematic, and fast, not dramatic.',
    ],
    relatedTopics: ['tight-deadline', 'technical-challenge', 'resilience'],
  },
  {
    slug: 'collaboration',
    label: 'Cross-Team Collaboration',
    questionPrompt: 'Describe a time you worked effectively across team boundaries to deliver a result.',
    description: 'STAR answer for cross-functional collaboration questions — template for engineering and product role interviews.',
    sitemapPriority: 0.79,
    sampleAnswer: {
      situation: 'Our mobile app team and the backend team needed to ship a real-time notification feature in the same sprint — but the two teams had never worked together before and had different sprint cadences and divergent API design preferences.',
      task: 'I was the backend engineer responsible for the notifications API. I needed to design an API that worked for the mobile team\'s requirements without requiring the mobile team to attend our daily standups or vice versa.',
      action: 'I scheduled a single 45-minute "API contract meeting" with the mobile lead at the start of the sprint. I prepared three API design options with trade-offs for each and had the mobile lead pick the one that worked best for their client architecture. I then wrote the API spec in OpenAPI format and shared it via a link — not a meeting invite — so the mobile team could build against a stable contract asynchronously. I set up a shared Slack channel for any API questions during the sprint, which generated four questions I resolved within the hour each time.',
      result: 'Both teams shipped their halves of the feature without a single blocking integration issue. End-to-end testing completed in three hours rather than the two-day integration buffer we had originally scheduled. The mobile lead told his manager this was the smoothest cross-team collaboration he had experienced in two years at the company.',
    },
    tips: [
      'Show how you reduced the cross-team coordination overhead rather than just pushing for more meetings.',
      'Describe your stakeholder empathy: you understood their constraints (different sprint cadence, different tech context) and adapted your approach.',
      'Written artefacts beat meetings for async collaboration — contracts, specs, and decisions documented in shared tools reduce friction dramatically.',
      'Close with evidence that the collaboration lasted beyond one story: a shared practice, improved relationship, or reusable process that benefited future sprints.',
    ],
    relatedTopics: ['stakeholder-management', 'leadership', 'process-improvement'],
  },
  {
    slug: 'resilience',
    label: 'Resilience & Overcoming Obstacles',
    questionPrompt: 'Tell me about a time you faced significant obstacles and how you overcame them.',
    description: 'STAR answer for resilience and perseverance questions — structured example for engineering and general interviews.',
    sitemapPriority: 0.80,
    sampleAnswer: {
      situation: 'Seven weeks into a six-month capstone project, our primary partner company withdrew their support, taking with them our dataset and API access. At that point, we had a working prototype but no path to the production data we had built everything around.',
      task: 'Our team of four had to decide whether to pivot the project entirely, find a new data source, or abandon the work done so far — with only four months and a major milestone review in three weeks.',
      action: 'Rather than escalating to the faculty advisor immediately, our team spent one evening auditing our core technical work to identify what was salvageable regardless of data source. We found that our data pipeline and ML model were generalizable. I spent the next week researching alternative open datasets and found a government open-data portal with comparable data under a permissive licence. I rebuilt the data ingestion layer in five days to work with the new source. I presented our revised project scope to the faculty advisor with a revised timeline showing we would hit the same quality bar, just with different data.',
      result: 'We hit the three-week milestone on schedule. The final project scored in the top 15% of the cohort. Our faculty advisor cited the team\'s response to the data crisis as a demonstration of genuine engineering resilience in his recommendation letter.',
    },
    tips: [
      'Show agency: the best resilience stories demonstrate that you actively problem-solved rather than waited for the obstacle to resolve itself.',
      'Include the emotional component briefly — "it was discouraging for 48 hours, but I decided to..." makes the resilience credible rather than performative.',
      'Demonstrate learning: what capability do you now have because of the obstacle that you wouldn\'t have built in the easy path?',
      'Do not use resilience stories that could be avoided by better planning — an obstacle you created by not planning ahead is a different story.',
    ],
    relatedTopics: ['failure-learning', 'ambiguity', 'goal-achievement'],
  },
] as const satisfies readonly StarTopicDefinition[]

/** Derived union type of all valid STAR topic slugs. */
export type StarTopicSlug = (typeof STAR_TOPICS)[number]['slug']

/** Narrowest type for a single STAR topic entry. */
export type StarTopic = (typeof STAR_TOPICS)[number]

/** Total number of STAR topics. */
export const STAR_TOPIC_COUNT = STAR_TOPICS.length as number

/** Returns a StarTopic by slug, or undefined if not found. */
export function getStarTopicBySlug(slug: string): StarTopic | undefined {
  return STAR_TOPICS.find((t) => t.slug === slug) as StarTopic | undefined
}
