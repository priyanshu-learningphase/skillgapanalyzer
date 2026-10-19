/**
 * HTML challenges. Your markup is parsed with DOMParser (scripts never run)
 * and checked against structural and accessibility rules. The preview
 * renders in a sandboxed iframe with scripts disabled.
 *
 * checks: { id, description, test: (doc) => boolean }
 */

const labelFor = (doc, input) => {
  if (!input) return null;
  if (input.id && doc.querySelector(`label[for="${CSS.escape(input.id)}"]`)) return true;
  if (input.closest('label')) return true;
  return Boolean(input.getAttribute('aria-label') || input.getAttribute('aria-labelledby'));
};

export const WEB_CHALLENGES = [
  {
    id: 'html-accessible-login',
    kind: 'html',
    skillId: 'html',
    category: 'web',
    difficulty: 'easy',
    title: 'An accessible login form',
    prompt: 'Build a login form with an email field, a password field and a submit button that works for keyboard and screen-reader users.',
    starter: '<form>\n  \n</form>\n',
    checks: [
      { id: 'form', description: 'Has a <form>', test: (doc) => Boolean(doc.querySelector('form')) },
      { id: 'email', description: 'Email input uses type="email"', test: (doc) => Boolean(doc.querySelector('form input[type="email"]')) },
      { id: 'email-label', description: 'Email input has a label', test: (doc) => Boolean(labelFor(doc, doc.querySelector('input[type="email"]'))) },
      { id: 'password', description: 'Password input uses type="password"', test: (doc) => Boolean(doc.querySelector('form input[type="password"]')) },
      { id: 'password-label', description: 'Password input has a label', test: (doc) => Boolean(labelFor(doc, doc.querySelector('input[type="password"]'))) },
      { id: 'required', description: 'Both fields are required', test: (doc) => [...doc.querySelectorAll('input[type="email"], input[type="password"]')].length === 2 && [...doc.querySelectorAll('input[type="email"], input[type="password"]')].every((i) => i.hasAttribute('required')) },
      { id: 'autocomplete', description: 'Fields set autocomplete (e.g. "email", "current-password")', test: (doc) => [...doc.querySelectorAll('input[type="email"], input[type="password"]')].every((i) => i.getAttribute('autocomplete')) },
      { id: 'submit', description: 'Has a submit button with visible text', test: (doc) => [...doc.querySelectorAll('button, input[type="submit"]')].some((b) => (b.tagName === 'BUTTON' ? b.getAttribute('type') !== 'button' && b.textContent.trim() : b.value?.trim())) },
    ],
    passRatio: 1,
    hints: ['Connect each <label for="…"> to an input id.', 'type="email" gives mobile users the right keyboard and built-in validation.', 'autocomplete="current-password" helps password managers.'],
    explanation: 'Labels give inputs an accessible name, correct input types improve validation and keyboards, and autocomplete hints help users fill forms quickly.',
    solution:
      '<form>\n  <label for="email">Email</label>\n  <input id="email" type="email" autocomplete="email" required>\n  <label for="password">Password</label>\n  <input id="password" type="password" autocomplete="current-password" required>\n  <button type="submit">Sign in</button>\n</form>',
  },
  {
    id: 'html-semantic-layout',
    kind: 'html',
    skillId: 'html',
    category: 'web',
    difficulty: 'medium',
    title: 'Semantic page structure',
    prompt: 'Mark up a blog post page: site header with a navigation menu of at least three links, a main area with the post (title, an image, text), and a footer. Use semantic elements, not just <div>s.',
    starter: '<!-- header, nav, main, article, footer -->\n',
    checks: [
      { id: 'header', description: 'Has a <header>', test: (doc) => Boolean(doc.querySelector('header')) },
      { id: 'nav', description: '<nav> contains a list of at least 3 links', test: (doc) => doc.querySelectorAll('nav ul li a[href], nav ol li a[href]').length >= 3 },
      { id: 'main', description: 'Exactly one <main>', test: (doc) => doc.querySelectorAll('main').length === 1 },
      { id: 'article', description: 'The post is an <article> inside <main>', test: (doc) => Boolean(doc.querySelector('main article')) },
      { id: 'h1', description: 'Exactly one <h1>', test: (doc) => doc.querySelectorAll('h1').length === 1 },
      { id: 'img-alt', description: 'Every <img> has an alt attribute', test: (doc) => doc.querySelectorAll('img').length > 0 && [...doc.querySelectorAll('img')].every((i) => i.hasAttribute('alt')) },
      {
        id: 'headings',
        description: 'Headings don’t skip levels (h1 → h2 → h3)',
        test: (doc) => {
          let last = 0;
          for (const h of doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
            const level = Number(h.tagName[1]);
            if (last && level > last + 1) return false;
            last = level;
          }
          return last > 0;
        },
      },
      { id: 'footer', description: 'Has a <footer>', test: (doc) => Boolean(doc.querySelector('footer')) },
    ],
    passRatio: 1,
    hints: ['Landmarks (header, nav, main, footer) let screen-reader users jump around.', 'Put the menu in a <ul> inside <nav>.', 'Decorative images still need alt="".'],
    explanation: 'Semantic landmarks and a sensible heading outline make pages navigable with assistive technology and easier for search engines to understand.',
    solution:
      '<header>\n  <nav><ul><li><a href="/">Home</a></li><li><a href="/blog">Blog</a></li><li><a href="/about">About</a></li></ul></nav>\n</header>\n<main>\n  <article>\n    <h1>Post title</h1>\n    <img src="cover.jpg" alt="Laptop on a desk">\n    <h2>Section</h2>\n    <p>Text…</p>\n  </article>\n</main>\n<footer>© 2026</footer>',
  },
];
