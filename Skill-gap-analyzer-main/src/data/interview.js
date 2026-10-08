/**
 * Interview question banks. Questions are assembled per user in
 * lib/interview.js from their role, company, gaps, projects and results.
 */

const t = (question, points) => ({ question, points });

/** Technical questions per skill, with what a strong answer covers. */
export const TECHNICAL = {
  javascript: [
    t('Explain the event loop and the difference between microtasks and macrotasks.', ['Call stack and task queues', 'Promises run before timers', 'Why long sync work blocks rendering']),
    t('What is a closure? Give a practical use.', ['Function + captured scope', 'Data privacy or factories', 'Stale closure pitfalls in callbacks']),
    t('How do var, let and const differ?', ['Function vs block scope', 'Hoisting and the temporal dead zone', 'const prevents reassignment, not mutation']),
  ],
  typescript: [
    t('When would you use unknown instead of any?', ['unknown forces narrowing', 'Safer API boundaries', 'Type guards']),
    t('Explain generics with an example from your code.', ['Reusable type-safe functions', 'Constraints with extends', 'Inference at call sites']),
  ],
  react: [
    t('How does React decide what to re-render, and how do you avoid unnecessary renders?', ['State/prop changes and parent renders', 'memo, useMemo, useCallback', 'Measure first with the Profiler']),
    t('Walk through how you’d fetch, cache and display server data.', ['Loading and error states', 'Server-state libraries like TanStack Query', 'Avoiding race conditions']),
    t('What problems do keys solve in lists?', ['Identity across renders', 'Preserved component state', 'Why array indexes break on reorder']),
  ],
  nodejs: [
    t('How does Node handle concurrency on a single thread?', ['Event loop + libuv thread pool', 'Non-blocking I/O', 'When to use worker threads']),
    t('How would you structure error handling in an Express API?', ['Central error middleware', 'Typed or operational errors vs bugs', 'Consistent error responses']),
  ],
  'rest-apis': [
    t('Design the endpoints for a simple e-commerce cart.', ['Resource naming', 'Correct methods and status codes', 'Idempotency and validation']),
    t('How do you version and paginate an API?', ['URL or header versioning', 'Cursor vs offset pagination', 'Backwards compatibility']),
  ],
  authentication: [
    t('Sessions vs JWTs — what are the trade-offs?', ['Server state vs stateless tokens', 'Revocation and expiry', 'Storage and XSS/CSRF exposure']),
    t('How do you store passwords securely?', ['Slow salted hashes (bcrypt/argon2)', 'Never encrypt or log them', 'Rate limiting and MFA']),
  ],
  sql: [
    t('Explain the different join types with an example.', ['INNER vs LEFT vs FULL', 'NULL handling', 'When results multiply']),
    t('A query is slow. How do you investigate?', ['EXPLAIN plans', 'Indexes and selectivity', 'N+1 queries from the application']),
    t('What are window functions and when would you use one?', ['PARTITION BY and ORDER BY', 'Running totals and rankings', 'Difference from GROUP BY']),
  ],
  python: [
    t('Explain generators and when you’d use them.', ['Lazy evaluation with yield', 'Memory efficiency', 'Pipelines over large data']),
    t('What is the GIL and how does it affect concurrency?', ['One thread runs Python bytecode at a time', 'Threads for I/O, processes for CPU', 'asyncio as an alternative']),
  ],
  java: [
    t('Explain how HashMap works internally.', ['Hashing and buckets', 'Collisions and treeification', 'equals/hashCode contract']),
    t('How do you make code thread-safe in Java?', ['synchronized and locks', 'Atomic classes and concurrent collections', 'Immutability']),
  ],
  dsa: [
    t('When would you choose a hash map over a balanced BST?', ['O(1) average vs O(log n) ordered operations', 'Ordering requirements', 'Memory and worst cases']),
    t('Explain how a heap supports a priority queue.', ['Complete binary tree in an array', 'Sift up and sift down', 'O(log n) insert and pop']),
  ],
  algorithms: [
    t('How do you recognise a dynamic programming problem?', ['Overlapping subproblems', 'Optimal substructure', 'Top-down vs bottom-up']),
    t('Walk through your approach to an unfamiliar coding problem.', ['Clarify and test with examples', 'Brute force first, then optimise', 'Talk through complexity']),
  ],
  'system-design': [
    t('How would you scale a read-heavy service from 1k to 1M users?', ['Caching layers', 'Read replicas and CDNs', 'Statelessness and horizontal scaling']),
    t('Explain consistency trade-offs in distributed databases.', ['CAP and PACELC', 'Strong vs eventual consistency', 'Choosing per use case']),
    t('How do you design for failure?', ['Timeouts, retries with backoff', 'Circuit breakers', 'Graceful degradation']),
  ],
  'distributed-systems': [
    t('Explain how Raft reaches consensus.', ['Leader election and terms', 'Log replication and commit', 'Behaviour during partitions']),
    t('How does consistent hashing help with partitioning?', ['Minimal reshuffling on node changes', 'Virtual nodes', 'Hot-key handling']),
  ],
  docker: [
    t('How do you keep Docker images small and builds fast?', ['Multi-stage builds', 'Layer ordering for caching', 'Minimal base images']),
    t('How do containers communicate in docker-compose?', ['Shared network and service-name DNS', 'Ports vs expose', 'Environment configuration']),
  ],
  kubernetes: [
    t('Walk through what happens when you kubectl apply a Deployment.', ['API server and etcd', 'Controllers and ReplicaSets', 'Scheduler and kubelet']),
    t('How do liveness and readiness probes differ?', ['Restart vs traffic gating', 'Failure thresholds', 'Startup probes for slow apps']),
  ],
  cloud: [
    t('Design a highly available web app on a cloud provider.', ['Multi-AZ compute and database', 'Load balancing and autoscaling', 'Backups and disaster recovery']),
    t('How do you secure cloud resources?', ['Least-privilege IAM', 'Network segmentation', 'Encryption and logging']),
  ],
  linux: [
    t('A server is slow. How do you troubleshoot it?', ['top/htop, load average', 'Memory, disk I/O and network checks', 'Logs and recent changes']),
  ],
  networking: [
    t('What happens when you type a URL into a browser?', ['DNS resolution', 'TCP and TLS handshakes', 'HTTP request, response and rendering']),
  ],
  'ci-cd': [
    t('Design a CI/CD pipeline for a microservice.', ['Build, test and scan stages', 'Artifact versioning', 'Deployment strategies and rollback']),
  ],
  statistics: [
    t('Explain p-values and statistical significance to a non-technical stakeholder.', ['What the test assumes', 'Practical vs statistical significance', 'Common misinterpretations']),
    t('How would you design an A/B test for a new checkout button?', ['Metric and guardrails', 'Sample size and duration', 'Randomisation and novelty effects']),
  ],
  'machine-learning': [
    t('How do you handle imbalanced classes?', ['Appropriate metrics', 'Resampling or class weights', 'Threshold tuning']),
    t('Walk through how you’d choose and evaluate a model for a new problem.', ['Baselines', 'Cross-validation', 'Error analysis and leakage checks']),
    t('Explain the bias–variance trade-off.', ['Underfitting vs overfitting', 'Model complexity', 'Regularisation and more data']),
  ],
  'deep-learning': [
    t('Why do we use batch normalisation and dropout?', ['Training stability', 'Regularisation', 'Behaviour at inference time']),
  ],
  pandas: [
    t('How would you clean a messy dataset before analysis?', ['Missing values and duplicates', 'Types and parsing', 'Validation checks']),
  ],
  'security-fundamentals': [
    t('Walk through how you’d respond to a suspected phishing compromise.', ['Containment', 'Credential resets and MFA', 'Investigation and lessons learned']),
  ],
  'web-security': [
    t('Explain the OWASP Top 10 risks you’d check first in a web app.', ['Broken access control', 'Injection', 'Security misconfiguration']),
    t('How do you prevent XSS in a modern front end?', ['Output encoding', 'Avoid dangerous HTML injection', 'Content Security Policy']),
  ],
  solidity: [
    t('How do you prevent reentrancy attacks?', ['Checks-effects-interactions', 'Reentrancy guards', 'Pull over push payments']),
  ],
  testing: [
    t('How do you decide what to test?', ['Risk and business impact', 'The testing pyramid', 'Testing behaviour, not implementation']),
  ],
  git: [
    t('Describe your branching and code review workflow.', ['Feature branches and small PRs', 'Rebasing vs merging', 'Resolving conflicts']),
  ],
};

/** Coding practice by role: classic problems grouped by pattern. */
const ENGINEERING_CODING = [
  { title: 'Two Sum', pattern: 'Hash map', difficulty: 'Easy' },
  { title: 'Valid Parentheses', pattern: 'Stack', difficulty: 'Easy' },
  { title: 'Longest Substring Without Repeating Characters', pattern: 'Sliding window', difficulty: 'Medium' },
  { title: 'Merge Intervals', pattern: 'Sorting', difficulty: 'Medium' },
  { title: 'Number of Islands', pattern: 'Graph BFS/DFS', difficulty: 'Medium' },
  { title: 'Top K Frequent Elements', pattern: 'Heap / bucket sort', difficulty: 'Medium' },
  { title: 'Course Schedule', pattern: 'Topological sort', difficulty: 'Medium' },
  { title: 'LRU Cache', pattern: 'Hash map + linked list', difficulty: 'Medium' },
  { title: 'Coin Change', pattern: 'Dynamic programming', difficulty: 'Medium' },
  { title: 'Merge K Sorted Lists', pattern: 'Heap', difficulty: 'Hard' },
];

const SQL_CODING = [
  { title: 'Second highest salary', pattern: 'Subqueries / window functions', difficulty: 'Easy' },
  { title: 'Customers who never ordered', pattern: 'LEFT JOIN / NOT EXISTS', difficulty: 'Easy' },
  { title: 'Running total of daily revenue', pattern: 'Window functions', difficulty: 'Medium' },
  { title: 'Top 3 products per category', pattern: 'ROW_NUMBER / RANK', difficulty: 'Medium' },
  { title: 'Monthly retention cohorts', pattern: 'Date bucketing + self-join', difficulty: 'Hard' },
];

const SCRIPTING_CODING = [
  { title: 'Count HTTP status codes in an access log', pattern: 'Parsing + hash map', difficulty: 'Easy' },
  { title: 'Find the 10 largest files under a directory', pattern: 'File system traversal', difficulty: 'Easy' },
  { title: 'Rate-limit a function call', pattern: 'Sliding window', difficulty: 'Medium' },
  { title: 'Parse and validate a YAML config', pattern: 'Data validation', difficulty: 'Medium' },
];

export const CODING_BY_ROLE = {
  'software-engineer': ENGINEERING_CODING,
  'backend-developer': ENGINEERING_CODING.slice(0, 8),
  'frontend-developer': [
    { title: 'Implement debounce and throttle', pattern: 'Closures + timers', difficulty: 'Medium' },
    { title: 'Build an autocomplete with keyboard navigation', pattern: 'UI state', difficulty: 'Medium' },
    { title: 'Flatten a nested array without flat()', pattern: 'Recursion', difficulty: 'Easy' },
    ...ENGINEERING_CODING.slice(0, 5),
  ],
  'fullstack-developer': ENGINEERING_CODING.slice(0, 8),
  'mobile-developer': ENGINEERING_CODING.slice(0, 6),
  'blockchain-developer': ENGINEERING_CODING.slice(0, 6),
  'data-scientist': [...SQL_CODING.slice(0, 4), ENGINEERING_CODING[0], ENGINEERING_CODING[5]],
  'data-analyst': SQL_CODING,
  'data-engineer': [...SQL_CODING, ENGINEERING_CODING[0], ENGINEERING_CODING[3]],
  'ml-engineer': [...ENGINEERING_CODING.slice(0, 6), SQL_CODING[2]],
  'devops-engineer': SCRIPTING_CODING,
  'cloud-engineer': SCRIPTING_CODING,
  'cybersecurity-engineer': SCRIPTING_CODING.slice(0, 3),
};

/** System design prompts by role. */
export const SYSTEM_DESIGN_BY_ROLE = {
  'software-engineer': ['Design a URL shortener', 'Design a rate limiter', 'Design a news feed', 'Design a chat service'],
  'backend-developer': ['Design a URL shortener', 'Design a rate limiter', 'Design a notification service', 'Design a payment processing flow'],
  'fullstack-developer': ['Design a collaborative to-do app with real-time sync', 'Design a URL shortener with analytics'],
  'frontend-developer': ['Design the front-end architecture for an infinite-scrolling feed', 'Design a reusable autocomplete component', 'Design a design-system rollout across teams'],
  'mobile-developer': ['Design an offline-first notes app', 'Design push notifications for a messaging app'],
  'data-engineer': ['Design a daily ETL pipeline for event data', 'Design a near-real-time analytics pipeline'],
  'data-scientist': ['How would you measure the success of a new feature?', 'Design an experiment to test a pricing change'],
  'data-analyst': ['Define the KPIs for a subscription product', 'Design a dashboard for a sales leadership team'],
  'ml-engineer': ['Design a recommendation system', 'Design a model serving and monitoring platform'],
  'devops-engineer': ['Design a CI/CD platform for 50 services', 'Design zero-downtime deployments'],
  'cloud-engineer': ['Design a multi-region, highly available web app', 'Design a secure landing zone for a new company'],
  'cybersecurity-engineer': ['Design authentication for a consumer app', 'Design an incident response process'],
  'blockchain-developer': ['Design a token vesting system', 'Design a dApp that indexes on-chain events'],
};

export const BEHAVIORAL = [
  t('Tell me about yourself.', ['Two-minute arc: past, present, why this role', 'Tie your projects to the job']),
  t('Tell me about a project you’re proud of.', ['Your specific contribution', 'A measurable result']),
  t('Describe a time you disagreed with a teammate.', ['Listen first', 'Data over opinions', 'How it was resolved']),
  t('Tell me about a mistake you made and what you learned.', ['Own it', 'What changed afterwards']),
  t('Describe a time you had to learn something quickly.', ['How you learned', 'How you applied it']),
  t('Why do you want to work here?', ['Specifics about the company and team', 'Link to your goals']),
];

export const COMPANY_QUESTIONS = {
  google: [
    t('Tell me about a time you had to make a decision with incomplete information.', ['Comfort with ambiguity', 'How you reduced risk']),
    t('Describe a time you helped a teammate succeed.', ['Collaboration', 'Impact on the team']),
  ],
  microsoft: [
    t('Tell me about a time you learned from failure.', ['Growth mindset', 'Concrete change in behaviour']),
    t('How have you used customer feedback to change a product?', ['Customer obsession', 'Iteration']),
  ],
  amazon: [
    t('Tell me about a time you went above and beyond for a customer. (Customer Obsession)', ['Customer impact', 'Metrics']),
    t('Describe a time you disagreed and committed. (Have Backbone; Disagree and Commit)', ['Respectful challenge', 'Full commitment afterwards']),
    t('Tell me about a time you took ownership of a problem outside your role. (Ownership)', ['Initiative', 'Long-term thinking']),
    t('Describe a time you simplified a process. (Invent and Simplify)', ['Before vs after', 'Measured impact']),
  ],
  jpmorgan: [
    t('Why financial services, and why technology in finance?', ['Genuine interest', 'Reliability and risk awareness']),
    t('Tell me about a time accuracy really mattered in your work.', ['Attention to detail', 'Verification steps']),
  ],
  atlassian: [
    t('Tell me about a time you were transparent about a mistake.', ['Openness', 'What you did next']),
    t('Describe how you’ve put the customer or user first in a technical decision.', ['User empathy', 'Trade-offs made']),
  ],
  startup: [
    t('Tell me about something you built end to end.', ['Ownership', 'Scope you handled alone']),
    t('How do you prioritise when everything feels urgent?', ['Impact vs effort', 'Communicating trade-offs']),
  ],
};
