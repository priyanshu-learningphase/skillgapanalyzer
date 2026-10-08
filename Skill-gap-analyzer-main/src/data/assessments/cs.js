import { q } from './q.js';

export const CS_BANK = {
  dsa: [
    q('concept', 'basic', 'What is the average time to look up a key in a hash map?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0, 'Average O(1); worst case O(n) with many collisions.'),
    q('concept', 'basic', 'Which data structure is last-in, first-out?', ['Queue', 'Stack', 'Heap', 'Graph'], 1, 'Stacks power undo, call stacks and bracket matching.'),
    q('concept', 'basic', 'Which data structure does breadth-first search use?', ['Stack', 'Queue', 'Hash set only', 'Binary tree'], 1, 'BFS explores level by level using a FIFO queue.'),
    q('code', 'basic', 'What is the time complexity?', ['O(n)', 'O(n²)', 'O(log n)', 'O(2ⁿ)'], 1, 'Two nested loops over n each run n × n times.', 'def f(n):\n    total = 0\n    for i in range(n):\n        for j in range(n):\n            total += 1\n    return total'),
    q('concept', 'basic', 'What’s the most efficient way to search a sorted array?', ['Linear scan', 'Binary search — O(log n)', 'Hashing every element first', 'Sorting it again'], 1, 'Halve the search space each step.'),
    q('scenario', 'intermediate', 'You repeatedly need the smallest element while inserting new ones. Which structure fits?', ['Sorted array', 'Min-heap (priority queue)', 'Linked list', 'Stack'], 1, 'Heaps give O(log n) insert and O(1) access to the minimum.'),
    q('concept', 'intermediate', 'What does an in-order traversal of a binary search tree return?', ['Keys in insertion order', 'Keys in sorted order', 'Keys level by level', 'Leaves only'], 1, 'Left, node, right visits a BST in ascending order.'),
    q('concept', 'advanced', 'How do you detect a cycle in a linked list with O(1) extra space?', ['Store visited nodes in a set', 'Floyd’s fast and slow pointers', 'Sort the list', 'Reverse it twice'], 1, 'If there’s a cycle, the fast pointer eventually meets the slow one.'),
  ],
  algorithms: [
    q('concept', 'basic', 'What is merge sort’s time complexity?', ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], 1, 'It splits log n times and merges n elements per level.'),
    q('concept', 'intermediate', 'Two-sum on a sorted array with O(1) extra space — which technique?', ['Hash map', 'Two pointers moving inward', 'Brute force', 'Recursion'], 1, 'Move the left or right pointer depending on the current sum.'),
    q('concept', 'intermediate', 'Dynamic programming applies when a problem has…', ['Only one solution', 'Overlapping subproblems and optimal substructure', 'No recursion', 'Sorted input'], 1, 'Memoise or tabulate subproblem results.'),
    q('code', 'intermediate', 'What is the time complexity of this function?', ['O(n)', 'O(n log n)', 'O(2ⁿ) — exponential', 'O(n²)'], 2, 'Each call branches twice and recomputes subproblems; memoisation makes it O(n).', 'def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)'),
    q('scenario', 'intermediate', 'Shortest path in a weighted graph with non-negative weights?', ['BFS', 'Dijkstra’s algorithm', 'DFS', 'Topological sort'], 1, 'BFS only works when all edges have equal weight.'),
    q('concept', 'intermediate', 'Longest substring without repeating characters — which pattern?', ['Binary search', 'Sliding window with a set or map', 'Divide and conquer', 'Greedy sorting'], 1, 'Expand the right edge, shrink the left on repeats: O(n).'),
    q('concept', 'intermediate', 'Topological sort applies to…', ['Any undirected graph', 'Directed acyclic graphs, e.g. ordering tasks with dependencies', 'Weighted shortest paths', 'Trees only'], 1, 'Cycles make an ordering impossible.'),
    q('concept', 'advanced', 'Which problem is typically solved with backtracking?', ['Finding the max of an array', 'Generating all permutations or solving N-Queens', 'Binary search', 'Computing a hash'], 1, 'Backtracking explores choices and undoes them on dead ends.'),
  ],
  'system-design': [
    q('concept', 'basic', 'What does a load balancer do?', ['Stores sessions', 'Distributes traffic across servers for scale and availability', 'Encrypts the database', 'Compiles code'], 1, 'It also removes unhealthy instances from rotation.'),
    q('concept', 'intermediate', 'How does the cache-aside pattern work?', ['The database writes to the cache automatically', 'The app checks the cache; on a miss it reads the DB and populates the cache', 'The cache is the source of truth', 'Every write goes only to the cache'], 1, 'Pair it with TTLs or invalidation on writes.'),
    q('concept', 'basic', 'Horizontal vs vertical scaling?', ['Same thing', 'Horizontal adds machines; vertical makes one machine bigger', 'Vertical adds machines', 'Horizontal only applies to databases'], 1, 'Horizontal scaling has no single-machine ceiling but needs statelessness.'),
    q('scenario', 'intermediate', 'A read-heavy service’s database sits at 90% CPU from repeated identical queries. First move?', ['Rewrite in another language', 'Add a cache such as Redis, or read replicas', 'Delete old data', 'Add more indexes to every column'], 1, 'Cache hot reads before scaling the database.'),
    q('concept', 'intermediate', 'During a network partition, the CAP theorem says you must choose between…', ['Speed and cost', 'Consistency and availability', 'Latency and throughput', 'SQL and NoSQL'], 1, 'Partitions happen; the trade-off is how you behave during one.'),
    q('concept', 'basic', 'What’s a key benefit of a message queue?', ['It replaces the database', 'It decouples producers and consumers, absorbs spikes and enables async work', 'It makes requests synchronous', 'It encrypts traffic'], 1, 'Queues smooth bursty load.'),
    q('scenario', 'advanced', 'Several app servers must generate unique short codes without collisions. What works?', ['Math.random on each server', 'A distributed ID scheme (e.g. Snowflake-style) or pre-allocated ID ranges per server', 'Timestamps alone', 'Client-generated codes'], 1, 'Coordinate uniqueness centrally or partition the ID space.'),
    q('concept', 'advanced', 'What’s the main trade-off of sharding by user_id?', ['It slows down every query', 'Load spreads across databases, but cross-shard queries and rebalancing get harder', 'It removes the need for backups', 'It only works with SQL'], 1, 'Choose shard keys that match your access patterns.'),
  ],
};
