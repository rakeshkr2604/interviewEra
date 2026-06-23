# GSC SEO Audit Report

Generated: 2026-06-23T10:06:47.386Z

| Metric | Value |
|--------|-------|
| GSC CSV URLs | 0 |
| Production crawl paths | 305 |
| Sitemap URLs | 270 |
| Audit rows | 72 |

## Summary by issue

- **Not found (404)**: 3
- **Crawled – currently not indexed**: 7
- **Page with redirect**: 4
- **Discovered – currently not indexed**: 25
- **Blocked by robots.txt**: 11
- **Excluded by noindex**: 22

## Audit table

| URL | Issue | Page type | Expected | Should index? | Root cause | Fix | Priority |
|-----|-------|-----------|----------|---------------|------------|-----|----------|
| /interview-questions/topics/css | Not found (404) | skill-topic | 404 | No | Invalid skill slug — registry uses html-css, not css | Fix internal links in freshworks-fe-hub → /topics/html-css | Critical |
| /interview-questions/topics/dsa | Not found (404) | skill-topic | 404 | No | No dsa skill slug — use algorithms or DSA blog hub | Fix internal links in solera/wipro hubs → /topics/algorithms | Critical |
| /interview-questions/topics/spring | Not found (404) | skill-topic | 404 | No | Invalid skill slug — registry uses spring-boot, not spring | Fix internal links in wipro-java-hub → /topics/spring-boot | Critical |
| /blog/agentic-coding-round | Crawled – currently not indexed | blog-post | index | Yes | Title too long (61 > 60) | Trim metadata to limits | High |
| /blog/what-is-agentic-ai | Crawled – currently not indexed | blog-post | index | Yes | Title too long (62 > 60) | Trim metadata to limits | High |
| /blog/what-is-star-method-with-examples | Crawled – currently not indexed | blog-post | index | Yes | Description too long (170 > 160) | Trim metadata to limits | High |
| /help-center | Crawled – currently not indexed | marketing-static | index | Yes | Description too long (162 > 160) | Trim metadata to limits | High |
| /interview-questions/companies/tcs | Page with redirect | company | redirect | No | 301 to pillar /interview-questions/tcs — internal link in solera-hub | Update href to /interview-questions/tcs | High |
| /interview-questions/companies/wipro | Crawled – currently not indexed | company | index | Yes | Title too long (63 > 60) | Trim metadata to limits | High |
| /interview-questions/topics/html-css | Crawled – currently not indexed | skill-topic | index | Yes | Title too long (62 > 60); Description too long (161 > 160) | Trim metadata to limits | High |
| /tools/ats-checker/android-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/backend-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/cloud-engineer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/devops-engineer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/frontend-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/full-stack-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/ios-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/java-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/node-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/python-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/react-developer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/ats-checker/software-engineer | Discovered – currently not indexed | tool-ats-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/android-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/backend-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/cloud-engineer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/data-analyst | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/devops-engineer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/frontend-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/full-stack-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/ios-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/java-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/node-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/python-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/react-developer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/question-generator/software-engineer | Discovered – currently not indexed | tool-qgen-role | index | Yes | Google discovered URL but has not crawled or indexed yet | Ensure sitemap + internal links; wait for crawl queue (1–4 weeks) | High |
| /tools/star-builder/mentoring | Crawled – currently not indexed | tool-star-topic | index | Yes | Title too long (61 > 60) | Trim metadata to limits | High |
| /admin/dashboard | Page with redirect | other | redirect | No | Blocked by robots.txt | Monitor after deploy | Medium |
| /college/dashboard | Page with redirect | other | redirect | No | Blocked by robots.txt | Monitor after deploy | Medium |
| /analytics | Blocked by robots.txt | other | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /college/signup | Blocked by robots.txt | other | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /dashboard | Excluded by noindex | app-private | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /feedback | Blocked by robots.txt | other | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /forgot-password | Excluded by noindex | other | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /history | Blocked by robots.txt | other | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /interview-questions/system-analyst | Excluded by noindex | role | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/agile | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/angular | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/azure | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/django | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/google-cloud | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/graphql | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/ios | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/jira | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/low-level-design | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/machine-learning | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/mysql | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/pandas | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/postgresql | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/react-js | Page with redirect | skill-topic | redirect | No | 301 to /topics/react — legacy slug redirect in next.config | Leave redirect; no internal links point to react-js | Low |
| /interview-questions/topics/redis | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview-questions/topics/typescript | Excluded by noindex | skill-topic | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /interview/new | Blocked by robots.txt | other | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /join | Excluded by noindex | other | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /login | Excluded by noindex | other | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /onboarding | Blocked by robots.txt | app-private | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /open/badges | Excluded by noindex | other | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /reset-password | Excluded by noindex | other | noindex | No | meta robots noindex | Intentional — leave unchanged | Low |
| /settings | Blocked by robots.txt | other | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /tools/ats-checker/results | Blocked by robots.txt | tool-ats-role | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /tools/question-generator/results | Blocked by robots.txt | tool-qgen-role | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /tools/star-builder/results | Blocked by robots.txt | tool-star-topic | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
| /upgrade | Blocked by robots.txt | other | noindex | No | URL matches robots.txt disallow prefix | Intentional — leave unchanged | Low |
