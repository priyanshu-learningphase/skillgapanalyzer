import { q } from './q.js';

export const SECURITY_BANK = {
  'security-fundamentals': [
    q('concept', 'basic', 'What does the CIA triad stand for?', ['Control, Inspect, Audit', 'Confidentiality, Integrity, Availability', 'Cyber Intelligence Agency', 'Certificates, Identity, Access'], 1, 'Most controls protect one or more of these.'),
    q('concept', 'basic', 'Hashing vs encryption?', ['Same thing', 'Hashing is one-way; encryption is reversible with a key', 'Encryption is one-way', 'Hashing needs a private key'], 1, 'Store passwords as salted hashes, never encrypted.'),
    q('concept', 'basic', 'What is phishing?', ['A firewall misconfiguration', 'Deceptive messages that trick people into revealing credentials or running malware', 'A type of encryption', 'A denial-of-service attack'], 1, 'People are often the easiest entry point.'),
    q('scenario', 'intermediate', 'Employees reuse passwords across sites. What’s the strongest mitigation?', ['Force monthly password changes', 'Require multi-factor authentication and provide a password manager', 'Ban long passwords', 'Email passwords to IT'], 1, 'MFA blocks most credential-stuffing attacks.'),
    q('concept', 'basic', 'What is least privilege?', ['Everyone gets admin', 'Each user or service gets only the access it needs', 'Disabling accounts at night', 'Sharing accounts'], 1, 'Limits damage from compromised accounts.'),
    q('concept', 'intermediate', 'What does defence in depth mean?', ['One very strong firewall', 'Layering multiple independent controls so one failure isn’t fatal', 'Hiding the system', 'Encrypting only backups'], 1, 'Network, host, application and people controls together.'),
    q('concept', 'intermediate', 'Symmetric vs asymmetric encryption?', ['Symmetric uses a key pair', 'Symmetric uses one shared key; asymmetric uses a public/private key pair', 'Asymmetric is always faster', 'They can’t be combined'], 1, 'TLS uses asymmetric crypto to agree on a symmetric key.'),
    q('concept', 'advanced', 'Why threat-model during design?', ['It’s required by law', 'To identify assets, threats and mitigations before they’re expensive to fix', 'To replace penetration testing', 'To speed up coding'], 1, 'STRIDE is a common framework.'),
  ],
  'web-security': [
    q('concept', 'basic', 'What primarily prevents SQL injection?', ['Input length limits', 'Parameterised queries / prepared statements', 'HTTPS', 'Hiding error messages'], 1, 'Never build SQL by concatenating user input.'),
    q('concept', 'basic', 'What is cross-site scripting (XSS)?', ['Stealing server files', 'Injecting malicious scripts into pages other users view', 'Overloading a site with traffic', 'Guessing passwords'], 1, 'Escape output and use a Content Security Policy.'),
    q('code', 'basic', 'What vulnerability does this code have?', ['XSS', 'SQL injection', 'CSRF', 'None'], 1, 'An input like \' OR \'1\'=\'1 changes the query’s meaning.', "db.query(\n  \"SELECT * FROM users WHERE name = '\" + req.query.name + \"'\"\n);"),
    q('concept', 'intermediate', 'How do you mitigate CSRF?', ['Use GET for state changes', 'Anti-CSRF tokens and SameSite cookies', 'Longer passwords', 'Rate limiting'], 1, 'Make cross-site requests unable to carry valid credentials.'),
    q('scenario', 'intermediate', 'Your app fetches user-supplied URLs, and one request reached the cloud metadata endpoint. What is this and how do you fix it?', ['XSS — escape output', 'SSRF — validate and allowlist destinations and block internal ranges', 'CSRF — add tokens', 'Clickjacking — add headers'], 1, 'Server-side request forgery can expose internal services and credentials.'),
    q('concept', 'basic', 'What does the HttpOnly cookie flag do?', ['Forces HTTPS', 'Prevents JavaScript from reading the cookie', 'Expires the cookie on close', 'Shares it across domains'], 1, 'Limits session theft via XSS.'),
    q('scenario', 'intermediate', 'Changing /invoices/1001 to /invoices/1002 shows another customer’s invoice. What’s the flaw?', ['SQL injection', 'Broken access control (IDOR)', 'XSS', 'Weak TLS'], 1, 'Check authorisation for every object, not just authentication.'),
    q('concept', 'advanced', 'What does a Content-Security-Policy header do?', ['Encrypts responses', 'Restricts where scripts and other resources can load from, mitigating XSS', 'Blocks bots', 'Compresses assets'], 1, 'Start with a strict default-src and add exceptions deliberately.'),
  ],
};
