/**
 * Structured practical tasks: write the exact command or pick the right
 * option for a realistic scenario. Nothing is executed — answers are matched
 * against accepted forms.
 *
 * steps: { type: 'command', prompt, accept: [regex source], placeholder }
 *      | { type: 'choice', prompt, options, answer }
 */

export const STRUCTURED_CHALLENGES = [
  {
    id: 'git-feature-branch',
    kind: 'structured',
    skillId: 'git',
    category: 'git',
    difficulty: 'easy',
    title: 'Ship a feature branch',
    prompt: 'You’re starting work on a login page in a fresh clone of your team’s repo. Write the commands for each step.',
    steps: [
      { type: 'command', prompt: 'Create a branch named feature/login and switch to it.', accept: ['^git (switch -c|checkout -b) feature/login$'], placeholder: 'git …' },
      { type: 'command', prompt: 'Stage every changed file.', accept: ['^git add (\\.|-A|--all)$'], placeholder: 'git …' },
      { type: 'command', prompt: 'Commit with the message: Add login page', accept: ['^git commit -m ("Add login page"|\'Add login page\')$'], placeholder: 'git …' },
      { type: 'command', prompt: 'Push the new branch to origin and set it as upstream.', accept: ['^git push (-u|--set-upstream) origin feature/login$'], placeholder: 'git …' },
    ],
    hints: ['git switch -c creates and switches in one go.', 'A dot means “everything in this directory”.', 'The first push of a branch needs -u to link it to the remote.'],
    explanation: 'Branch → stage → commit → push -u is the daily loop. Setting the upstream once means later pushes and pulls need no arguments.',
  },
  {
    id: 'git-fix-mistakes',
    kind: 'structured',
    skillId: 'git',
    category: 'git',
    difficulty: 'medium',
    title: 'Undo mistakes safely',
    prompt: 'Recover from common mistakes without losing work.',
    steps: [
      { type: 'command', prompt: 'Undo your last commit but keep its changes staged.', accept: ['^git reset --soft HEAD(~1|\\^)?$'], placeholder: 'git …' },
      { type: 'command', prompt: 'Throw away your uncommitted edits to app.js only.', accept: ['^git (restore|checkout --) app\\.js$', '^git restore --worktree app\\.js$'], placeholder: 'git …' },
      { type: 'command', prompt: 'Show who last changed each line of server.js.', accept: ['^git blame server\\.js$'], placeholder: 'git …' },
      {
        type: 'choice',
        prompt: 'You pushed a commit with a bug to the shared main branch. What’s the safe way to undo it?',
        options: ['git reset --hard HEAD~1 then git push --force', 'git revert <commit> then push', 'Delete the branch and recreate it', 'Edit the files back by hand without committing'],
        answer: 1,
      },
    ],
    hints: ['--soft moves the branch pointer but keeps your changes.', 'git restore is the modern way to discard file changes.', 'Shared history shouldn’t be rewritten.'],
    explanation: 'reset rewrites history and is fine for local commits; revert adds a new commit that undoes one, which is safe on shared branches.',
  },
  {
    id: 'git-merge-conflict',
    kind: 'structured',
    skillId: 'git',
    category: 'git',
    difficulty: 'hard',
    title: 'Resolve a merge conflict',
    prompt: 'Your branch conflicts with main in config.js. Work through the resolution.',
    steps: [
      { type: 'command', prompt: 'Bring the latest main into your branch by rebasing onto origin/main (after fetching).', accept: ['^git rebase origin/main$', '^git pull --rebase origin main$'], placeholder: 'git …' },
      {
        type: 'choice',
        prompt: 'config.js now contains <<<<<<<, ======= and >>>>>>> markers. What do they separate?',
        options: ['Two versions of the conflicting lines: yours and the incoming ones', 'Lines Git deleted', 'Comments Git added for reviewers', 'The file’s old and new permissions'],
        answer: 0,
      },
      { type: 'command', prompt: 'After editing config.js to the correct content, mark it as resolved.', accept: ['^git add config\\.js$'], placeholder: 'git …' },
      { type: 'command', prompt: 'Continue the rebase.', accept: ['^git rebase --continue$'], placeholder: 'git …' },
    ],
    hints: ['Fetch first so origin/main is current.', 'Staging a file tells Git the conflict is resolved.', 'A paused rebase resumes with --continue.'],
    explanation: 'Rebasing replays your commits on top of main. Conflicts pause it; edit, stage and continue for each conflicting commit.',
  },
  {
    id: 'api-rest-design',
    kind: 'structured',
    skillId: 'rest-apis',
    category: 'backend',
    difficulty: 'easy',
    title: 'Design REST endpoints',
    prompt: 'Design endpoints for an orders service. Write the method and path, e.g. GET /products.',
    steps: [
      { type: 'command', prompt: 'List the orders of user 42.', accept: ['^GET /users/42/orders/?$'], placeholder: 'METHOD /path' },
      { type: 'command', prompt: 'Create a new order.', accept: ['^POST /orders/?$'], placeholder: 'METHOD /path' },
      { type: 'command', prompt: 'Change only the status field of order 7.', accept: ['^PATCH /orders/7/?$'], placeholder: 'METHOD /path' },
      { type: 'choice', prompt: 'Which status code fits a successful POST that created the order?', options: ['200 OK', '201 Created', '204 No Content', '302 Found'], answer: 1 },
      { type: 'choice', prompt: 'A client sends an order without the required items field. Which status?', options: ['400 Bad Request', '401 Unauthorized', '404 Not Found', '500 Internal Server Error'], answer: 0 },
    ],
    hints: ['Resources are nouns; nesting shows ownership.', 'PATCH updates part of a resource; PUT replaces it.', '4xx means the client must change the request.'],
    explanation: 'Nouns for resources, HTTP methods for actions, and precise status codes make APIs predictable for every client.',
  },
];
