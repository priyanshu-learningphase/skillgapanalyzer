/**
 * Coding challenges graded by test cases.
 *
 * JavaScript runs in an isolated browser sandbox (sandboxed iframe + worker,
 * no network, time-limited). Python needs a code-execution service configured
 * on the server (see /api/execute); without one, Python is shown as
 * unavailable rather than pretending to grade it.
 *
 * tests: { args: [...], expected, hidden? } — `expected` is checked with a
 * deep-equality comparison. `solutions.javascript` is the reference used by
 * the test suite to prove every expected value is right.
 */

const twoSum = {
  id: 'dsa-two-sum',
  kind: 'code',
  skillId: 'dsa',
  category: 'dsa',
  difficulty: 'easy',
  title: 'Two numbers that add up',
  prompt:
    'Given an array of integers `nums` and a target, return the indices `[i, j]` (with i < j) of the two numbers that add up to the target. Exactly one pair matches. Aim for O(n) time.',
  languages: {
    javascript: { functionName: 'twoSum', starter: 'function twoSum(nums, target) {\n  // return [i, j]\n}\n' },
    python: { functionName: 'two_sum', starter: 'def two_sum(nums, target):\n    # return [i, j]\n    pass\n' },
  },
  examples: [{ input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]' }],
  tests: [
    { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { args: [[3, 2, 4], 6], expected: [1, 2] },
    { args: [[-3, 4, 3, 90], 0], expected: [0, 2], hidden: true },
    { args: [[1, 5, 5, 8], 10], expected: [1, 2], hidden: true },
    { args: [[0, 4, 3, 0], 0], expected: [0, 3], hidden: true },
  ],
  hints: ['For each number, the partner you need is target − number.', 'A Map from value → index lets you look partners up in O(1).'],
  explanation: 'One pass with a hash map: before storing nums[i], check whether target − nums[i] is already in the map. O(n) time, O(n) space.',
  solutions: {
    javascript: 'function twoSum(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i++) { if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i]; seen.set(nums[i], i); } return []; }',
  },
};

const brackets = {
  id: 'dsa-valid-brackets',
  kind: 'code',
  skillId: 'dsa',
  category: 'dsa',
  difficulty: 'medium',
  title: 'Balanced brackets',
  prompt: 'Return `true` if every bracket in the string — `()`, `[]` and `{}` — is closed by the same type in the correct order. Other characters can be ignored.',
  languages: {
    javascript: { functionName: 'isBalanced', starter: 'function isBalanced(s) {\n  \n}\n' },
    python: { functionName: 'is_balanced', starter: 'def is_balanced(s):\n    pass\n' },
  },
  examples: [
    { input: '"{[()]}"', output: 'true' },
    { input: '"(]"', output: 'false' },
  ],
  tests: [
    { args: ['{[()]}'], expected: true },
    { args: ['(]'], expected: false },
    { args: ['fn(a[0]) { return x; }'], expected: true },
    { args: [''], expected: true, hidden: true },
    { args: ['(('], expected: false, hidden: true },
    { args: ['())('], expected: false, hidden: true },
    { args: ['[{}]({})'], expected: true, hidden: true },
  ],
  hints: ['Use a stack.', 'Push opening brackets; on a closing bracket, the top of the stack must be its partner.', 'The stack must be empty at the end.'],
  explanation: 'A stack mirrors nesting: the most recent unclosed bracket must close first. Check the top on every closer and make sure nothing is left open.',
  solutions: {
    javascript:
      "function isBalanced(s) { const pairs = { ')': '(', ']': '[', '}': '{' }; const stack = []; for (const ch of s) { if ('([{'.includes(ch)) stack.push(ch); else if (pairs[ch]) { if (stack.pop() !== pairs[ch]) return false; } } return stack.length === 0; }",
  },
};

const intervals = {
  id: 'algo-merge-intervals',
  kind: 'code',
  skillId: 'algorithms',
  category: 'dsa',
  difficulty: 'medium',
  title: 'Merge meeting slots',
  prompt: 'Given a list of intervals `[start, end]` in any order, merge all overlapping intervals (touching ones like [1,3] and [3,5] merge too) and return them sorted by start.',
  languages: {
    javascript: { functionName: 'mergeIntervals', starter: 'function mergeIntervals(intervals) {\n  \n}\n' },
    python: { functionName: 'merge_intervals', starter: 'def merge_intervals(intervals):\n    pass\n' },
  },
  examples: [{ input: '[[1,3],[8,10],[2,6]]', output: '[[1,6],[8,10]]' }],
  tests: [
    { args: [[[1, 3], [8, 10], [2, 6]]], expected: [[1, 6], [8, 10]] },
    { args: [[[1, 3], [3, 5]]], expected: [[1, 5]] },
    { args: [[]], expected: [], hidden: true },
    { args: [[[5, 7], [1, 2], [2, 4], [6, 6]]], expected: [[1, 4], [5, 7]], hidden: true },
    { args: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]], hidden: true },
  ],
  hints: ['Sort by start first.', 'Walk the sorted list, extending the last merged interval while the next one starts before (or at) its end.'],
  explanation: 'After sorting, overlaps can only happen with the most recent merged interval, so one pass is enough. O(n log n) for the sort.',
  solutions: {
    javascript:
      'function mergeIntervals(intervals) { const sorted = [...intervals].sort((a, b) => a[0] - b[0]); const out = []; for (const [s, e] of sorted) { const last = out[out.length - 1]; if (last && s <= last[1]) last[1] = Math.max(last[1], e); else out.push([s, e]); } return out; }',
  },
};

const gridPath = {
  id: 'algo-grid-shortest-path',
  kind: 'code',
  skillId: 'algorithms',
  category: 'dsa',
  difficulty: 'hard',
  title: 'Shortest path through a maze',
  prompt:
    'A grid has 0 for open cells and 1 for walls. Moving up, down, left or right, return the minimum number of moves from the top-left to the bottom-right cell, or −1 if it can’t be reached. Start and end are always open.',
  languages: {
    javascript: { functionName: 'shortestPath', starter: 'function shortestPath(grid) {\n  \n}\n' },
    python: { functionName: 'shortest_path', starter: 'def shortest_path(grid):\n    pass\n' },
  },
  examples: [{ input: '[[0,0,0],[1,1,0],[0,0,0]]', output: '4' }],
  tests: [
    { args: [[[0, 0, 0], [1, 1, 0], [0, 0, 0]]], expected: 4 },
    { args: [[[0, 1], [1, 0]]], expected: -1 },
    { args: [[[0]]], expected: 0, hidden: true },
    { args: [[[0, 0, 1, 0], [1, 0, 1, 0], [1, 0, 0, 0], [1, 1, 1, 0]]], expected: 6, hidden: true },
    { args: [[[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]]], expected: 6, hidden: true },
  ],
  hints: ['Breadth-first search explores cells in order of distance.', 'Track visited cells so you don’t loop.', 'Store (row, col, distance) in the queue.'],
  explanation: 'BFS finds the shortest path in an unweighted grid because it visits every cell at distance d before any at d + 1. O(rows × cols).',
  solutions: {
    javascript:
      'function shortestPath(grid) { const R = grid.length, C = grid[0].length; const seen = new Set(["0,0"]); const q = [[0, 0, 0]]; for (let h = 0; h < q.length; h++) { const [r, c, d] = q[h]; if (r === R - 1 && c === C - 1) return d; for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nr = r + dr, nc = c + dc; const k = nr + "," + nc; if (nr >= 0 && nc >= 0 && nr < R && nc < C && !grid[nr][nc] && !seen.has(k)) { seen.add(k); q.push([nr, nc, d + 1]); } } } return -1; }',
  },
};

const groupBy = {
  id: 'js-group-by',
  kind: 'code',
  skillId: 'javascript',
  category: 'languages',
  difficulty: 'easy',
  title: 'Group records by a field',
  prompt: 'Write `groupBy(items, key)` that returns an object mapping each distinct value of `item[key]` to the array of items with that value, keeping their original order.',
  languages: { javascript: { functionName: 'groupBy', starter: 'function groupBy(items, key) {\n  \n}\n' } },
  examples: [{ input: "groupBy([{t:'a',n:1},{t:'b',n:2},{t:'a',n:3}], 't')", output: "{ a: [{t:'a',n:1},{t:'a',n:3}], b: [{t:'b',n:2}] }" }],
  tests: [
    { args: [[{ t: 'a', n: 1 }, { t: 'b', n: 2 }, { t: 'a', n: 3 }], 't'], expected: { a: [{ t: 'a', n: 1 }, { t: 'a', n: 3 }], b: [{ t: 'b', n: 2 }] } },
    { args: [[], 'x'], expected: {} },
    { args: [[{ city: 'Pune' }, { city: 'Delhi' }, { city: 'Pune' }], 'city'], expected: { Pune: [{ city: 'Pune' }, { city: 'Pune' }], Delhi: [{ city: 'Delhi' }] }, hidden: true },
  ],
  hints: ['Start from an empty object.', 'For each item, create the array for its key if needed, then push.'],
  explanation: 'A single reduce/loop builds the groups. Object.groupBy now does this natively in modern runtimes, but knowing the pattern matters in interviews.',
  solutions: { javascript: 'function groupBy(items, key) { const out = {}; for (const item of items) (out[item[key]] ||= []).push(item); return out; }' },
};

const flatten = {
  id: 'js-flatten-depth',
  kind: 'code',
  skillId: 'javascript',
  category: 'languages',
  difficulty: 'medium',
  title: 'Flatten to a given depth',
  prompt: 'Implement `flatten(arr, depth = 1)` without using Array.prototype.flat. Nested arrays deeper than `depth` stay nested.',
  languages: { javascript: { functionName: 'flatten', starter: 'function flatten(arr, depth = 1) {\n  \n}\n' } },
  examples: [{ input: 'flatten([1, [2, [3, [4]]]], 2)', output: '[1, 2, 3, [4]]' }],
  tests: [
    { args: [[1, [2, [3, [4]]]], 2], expected: [1, 2, 3, [4]] },
    { args: [[1, [2, [3]]]], expected: [1, 2, [3]] },
    { args: [[[1, 2], [3]], 0], expected: [[1, 2], [3]], hidden: true },
    { args: [[1, [2, [3, [4, [5]]]]], 10], expected: [1, 2, 3, 4, 5], hidden: true },
  ],
  hints: ['Recursion with a decreasing depth works well.', 'Only recurse into elements that are arrays, and only while depth > 0.'],
  explanation: 'Each level of recursion removes one level of nesting; the depth parameter controls how far to go.',
  solutions: { javascript: 'function flatten(arr, depth = 1) { const out = []; for (const x of arr) { if (Array.isArray(x) && depth > 0) out.push(...flatten(x, depth - 1)); else out.push(x); } return out; }' },
};

const validatePayload = {
  id: 'api-validate-signup',
  kind: 'code',
  skillId: 'rest-apis',
  category: 'backend',
  difficulty: 'medium',
  title: 'Validate a signup request',
  prompt:
    'Write `validateSignup(body)` for a POST /signup handler. Return `{ status: 201 }` when valid. Otherwise return `{ status: 400, errors }` where `errors` maps each invalid field to a message key:\n• email — required, must contain one "@" with text on both sides → "invalid_email"\n• password — at least 8 characters → "too_short"\n• age — optional; if present must be an integer from 13 to 120 → "invalid_age"\nIf `body` isn’t an object, return `{ status: 400, errors: { body: "invalid_body" } }`.',
  languages: { javascript: { functionName: 'validateSignup', starter: 'function validateSignup(body) {\n  \n}\n' } },
  examples: [{ input: "{ email: 'a@b.co', password: 'hunter22!' }", output: '{ status: 201 }' }],
  tests: [
    { args: [{ email: 'a@b.co', password: 'hunter22!' }], expected: { status: 201 } },
    { args: [{ email: 'nope', password: 'short' }], expected: { status: 400, errors: { email: 'invalid_email', password: 'too_short' } } },
    { args: [null], expected: { status: 400, errors: { body: 'invalid_body' } } },
    { args: [{ email: 'x@y.in', password: '12345678', age: 12 }], expected: { status: 400, errors: { age: 'invalid_age' } }, hidden: true },
    { args: [{ email: 'x@y.in', password: '12345678', age: 30.5 }], expected: { status: 400, errors: { age: 'invalid_age' } }, hidden: true },
    { args: [{ email: '@y.in', password: '12345678' }], expected: { status: 400, errors: { email: 'invalid_email' } }, hidden: true },
    { args: [{ email: 'x@y.in', password: '12345678', age: 13 }], expected: { status: 201 }, hidden: true },
    { args: [['a@b.co']], expected: { status: 400, errors: { body: 'invalid_body' } }, hidden: true },
  ],
  hints: ['Check the body type first (arrays are objects too).', 'Collect errors into an object, then decide the status at the end.', 'Number.isInteger rejects 30.5.'],
  explanation: 'Validating at the edge and returning field-level errors with 400 lets clients show precise messages; 201 signals a created resource.',
  solutions: {
    javascript:
      "function validateSignup(body) { if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, errors: { body: 'invalid_body' } }; const errors = {}; const e = typeof body.email === 'string' ? body.email.split('@') : []; if (e.length !== 2 || !e[0] || !e[1]) errors.email = 'invalid_email'; if (typeof body.password !== 'string' || body.password.length < 8) errors.password = 'too_short'; if (body.age !== undefined && !(Number.isInteger(body.age) && body.age >= 13 && body.age <= 120)) errors.age = 'invalid_age'; return Object.keys(errors).length ? { status: 400, errors } : { status: 201 }; }",
  },
};

const rateLimiter = {
  id: 'api-rate-limiter',
  kind: 'code',
  skillId: 'rest-apis',
  category: 'backend',
  difficulty: 'hard',
  title: 'Sliding-window rate limiter',
  prompt:
    'An API allows each client at most `limit` requests in any rolling window of `windowMs` milliseconds. Given requests `[{ client, t }]` sorted by time `t` (ms), return an array of booleans: true if the request is allowed. Rejected requests don’t count toward the limit.',
  languages: { javascript: { functionName: 'rateLimit', starter: 'function rateLimit(requests, limit, windowMs) {\n  \n}\n' } },
  examples: [{ input: "[{client:'a',t:0},{client:'a',t:10},{client:'a',t:20}], limit 2, window 100", output: '[true, true, false]' }],
  tests: [
    { args: [[{ client: 'a', t: 0 }, { client: 'a', t: 10 }, { client: 'a', t: 20 }], 2, 100], expected: [true, true, false] },
    { args: [[{ client: 'a', t: 0 }, { client: 'b', t: 1 }, { client: 'a', t: 2 }, { client: 'b', t: 3 }], 1, 100], expected: [true, true, false, false] },
    { args: [[{ client: 'a', t: 0 }, { client: 'a', t: 50 }, { client: 'a', t: 100 }, { client: 'a', t: 120 }], 2, 100], expected: [true, true, true, false], hidden: true },
    { args: [[], 5, 1000], expected: [], hidden: true },
    { args: [[{ client: 'x', t: 0 }, { client: 'x', t: 1 }, { client: 'x', t: 2 }, { client: 'x', t: 1002 }], 2, 1000], expected: [true, true, false, true], hidden: true },
  ],
  hints: ['Keep a list of accepted timestamps per client.', 'Before deciding, drop timestamps older than t − windowMs (a request exactly windowMs ago has left the window).', 'Only record accepted requests.'],
  explanation: 'A per-client queue of accepted timestamps implements a sliding window log. Trimming expired entries first keeps each decision O(1) amortised.',
  solutions: {
    javascript:
      'function rateLimit(requests, limit, windowMs) { const logs = new Map(); return requests.map(({ client, t }) => { const log = logs.get(client) || []; while (log.length && log[0] <= t - windowMs) log.shift(); const ok = log.length < limit; if (ok) log.push(t); logs.set(client, log); return ok; }); }',
  },
};

const wordFrequency = {
  id: 'py-top-words',
  kind: 'code',
  skillId: 'python',
  category: 'languages',
  difficulty: 'easy',
  title: 'Most frequent words (Python)',
  prompt: 'Write `top_words(text, k)` returning the `k` most frequent words (case-insensitive, letters only) as a list, most frequent first; ties broken alphabetically.',
  languages: { python: { functionName: 'top_words', starter: 'def top_words(text, k):\n    pass\n' } },
  examples: [{ input: 'top_words("the cat and the hat", 2)', output: '["the", "and"]' }],
  tests: [
    { args: ['the cat and the hat', 2], expected: ['the', 'and'] },
    { args: ['Go go GO stop', 1], expected: ['go'] },
    { args: ['b a c b a', 2], expected: ['a', 'b'], hidden: true },
    { args: ['', 3], expected: [], hidden: true },
  ],
  hints: ['re.findall(r"[a-z]+", text.lower()) extracts words.', 'collections.Counter counts them.', 'Sort by (-count, word).'],
  explanation: 'Counter does the counting; a sort key of (-count, word) gives frequency order with alphabetical tie-breaks.',
  solutions: {},
};

export const CODE_CHALLENGES = [twoSum, brackets, intervals, gridPath, groupBy, flatten, validatePayload, rateLimiter, wordFrequency];
