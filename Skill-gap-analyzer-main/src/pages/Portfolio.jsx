/**
 * Career portfolio: choose what to show, preview it, download a readiness
 * report and (with an account) publish a public link.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Globe2, Lock, Plus, Trash2, Copy, EyeOff, RefreshCw, Award, ScanSearch } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Field, { describedBy, inputClass } from '../components/ui/Field';
import { Modal, ConfirmDialog } from '../components/ui/Overlay';
import { Notice } from '../components/ui/States';
import PortfolioView from '../components/portfolio/PortfolioView';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PORTFOLIO_SECTIONS, buildPortfolio, normalizePortfolioSettings, portfolioHash, suggestSlug, validateCertificate, validatePortfolioSettings, validateSlug } from '../lib/portfolio';
import { canPublish, publishPortfolio, unpublishPortfolio } from '../services/portfolioService';

const CertificateModal = ({ open, onClose, onSave }) => {
  const [v, setV] = useState({ name: '', issuer: '', date: '', url: '' });
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setV((x) => ({ ...x, [f]: e.target.value }));
  const save = () => {
    const result = validateCertificate(v);
    setErrors(result.errors);
    if (!result.ok) return;
    onSave({ ...v, id: `c_${Date.now().toString(36)}` });
    setV({ name: '', issuer: '', date: '', url: '' });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a certificate or achievement"
      description="Shown as self-reported. Add a verification link if the issuer provides one."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Add</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cert-name" label="Name" error={errors.name} className="sm:col-span-2">
          <input id="cert-name" value={v.name} onChange={set('name')} maxLength={120} className={inputClass(errors.name)} placeholder="e.g. AWS Certified Cloud Practitioner" aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('cert-name', errors.name)} />
        </Field>
        <Field id="cert-issuer" label="Issuer" optional>
          <input id="cert-issuer" value={v.issuer} onChange={set('issuer')} maxLength={80} className="input" />
        </Field>
        <Field id="cert-date" label="Date" optional error={errors.date}>
          <input id="cert-date" type="month" value={v.date} onChange={set('date')} className={inputClass(errors.date)} />
        </Field>
        <Field id="cert-url" label="Verification link" optional error={errors.url} className="sm:col-span-2">
          <input id="cert-url" type="url" value={v.url} onChange={set('url')} className={inputClass(errors.url)} placeholder="https://…" aria-describedby={describedBy('cert-url', errors.url)} />
        </Field>
      </div>
    </Modal>
  );
};

const Portfolio = () => {
  const ws = useWorkspace();
  const { career, role, analysis, evidence, progress, insights, roadmap, latestAssessments, actions } = ws;
  const { currentUser, userProfile } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState(() => {
    const s = normalizePortfolioSettings(insights.portfolio);
    if (!s.displayName) s.displayName = userProfile?.name || '';
    return s;
  });
  const [errors, setErrors] = useState({});
  const [slugError, setSlugError] = useState('');
  const [addingCert, setAddingCert] = useState(false);
  const [busy, setBusy] = useState(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const saveRef = useRef(actions.saveInsight);
  saveRef.current = actions.saveInsight;
  // What was last written, so unchanged settings never trigger a save.
  const lastSaved = useRef(JSON.stringify(settings));

  // Autosave settings (debounced) when they change.
  useEffect(() => {
    const json = JSON.stringify(settings);
    if (json === lastSaved.current) return undefined;
    const t = setTimeout(() => {
      lastSaved.current = json;
      saveRef.current('portfolio', settings);
    }, 700);
    return () => clearTimeout(t);
  }, [settings]);

  const snapshot = useMemo(
    () => buildPortfolio({ settings, role, analysis, evidence, career, progress, github: insights.github, roadmap, latestAssessments }),
    [settings, role, analysis, evidence, career, progress, insights.github, roadmap, latestAssessments],
  );
  const hash = portfolioHash(snapshot);
  const outdated = settings.published && settings.publishedHash !== hash;
  const publicUrl = settings.slug ? `${window.location.origin}/p/${settings.slug}` : '';

  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const setLink = (key) => (e) => setSettings((s) => ({ ...s, links: { ...s.links, [key]: e.target.value } }));

  const downloadReport = async () => {
    if (!analysis) return;
    setBusy('report');
    try {
      const [{ buildReadinessReport }, { downloadBytes }] = await Promise.all([import('../lib/reportPdf'), import('../lib/resumeExport')]);
      const bytes = await buildReadinessReport({ name: settings.displayName, role, analysis, evidence, portfolio: buildPortfolio({ settings: { ...settings, visibility: { ...settings.visibility, projects: true, assessments: true } }, role, analysis, evidence, career, progress, roadmap, latestAssessments }) });
      downloadBytes(bytes, 'skillgap-readiness-report.pdf', 'application/pdf');
    } catch (err) {
      toast.error('Couldn’t create the report', { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    const result = validatePortfolioSettings(settings);
    setErrors(result.errors);
    const slug = settings.slug || suggestSlug(settings.displayName);
    const slugProblem = validateSlug(slug);
    setSlugError(slugProblem || '');
    if (!result.ok || slugProblem) return;
    setBusy('publish');
    try {
      await publishPortfolio({ uid: currentUser.uid, slug, previousSlug: settings.published ? insights.portfolio?.slug : null, snapshot });
      set({ slug, published: true, publishedAt: new Date().toISOString(), publishedHash: hash });
      toast.success(settings.published ? 'Public page updated' : 'Portfolio published', { description: `${window.location.origin}/p/${slug}` });
    } catch (err) {
      if (err.code === 'slug_taken') setSlugError(err.message);
      else toast.error('Couldn’t publish', { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    setBusy('unpublish');
    try {
      await unpublishPortfolio(settings.slug);
      set({ published: false, publishedAt: null, publishedHash: null });
      toast.success('Portfolio unpublished', { description: 'The public link no longer works.' });
    } catch (err) {
      toast.error('Couldn’t unpublish', { description: err.message });
    } finally {
      setBusy(null);
      setConfirmUnpublish(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Career portfolio"
        description="Choose what to share — skills with their evidence, verified results, projects and milestones — and preview exactly what visitors will see."
        actions={
          <Button variant="secondary" icon={Download} onClick={downloadReport} loading={busy === 'report'} disabled={!analysis}>
            Readiness report (PDF)
          </Button>
        }
      />

      {!analysis && (
        <Notice
          tone="accent"
          icon={ScanSearch}
          title="Your portfolio fills in after a skill analysis"
          className="mb-4"
          action={
            <Button size="sm" to="/onboarding">
              Analyze Skills
            </Button>
          }
        >
          Your target role, readiness score and skills come from it, and the PDF report needs it too.
        </Notice>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Profile" />
            <CardBody className="space-y-4">
              <Field id="pf-name" label="Display name" error={errors.displayName}>
                <input id="pf-name" value={settings.displayName} onChange={(e) => set({ displayName: e.target.value })} maxLength={80} className={inputClass(errors.displayName)} aria-describedby={describedBy('pf-name', errors.displayName)} />
              </Field>
              <Field id="pf-headline" label="Headline" optional error={errors.headline}>
                <input id="pf-headline" value={settings.headline} onChange={(e) => set({ headline: e.target.value })} maxLength={120} className="input" placeholder="e.g. Final-year CSE student · aspiring backend engineer" />
              </Field>
              <Field id="pf-bio" label="About" optional error={errors.bio} hint={`${settings.bio.length}/600`}>
                <textarea id="pf-bio" value={settings.bio} onChange={(e) => set({ bio: e.target.value })} maxLength={600} rows={4} className="input resize-y" aria-describedby="pf-bio-hint" />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="What’s public" description="Only checked sections are included. Resume text, applications and notes are never shared." />
            <CardBody>
              <ul className="space-y-2">
                {PORTFOLIO_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                      <input type="checkbox" checked={settings.visibility[s.id]} onChange={(e) => set({ visibility: { ...settings.visibility, [s.id]: e.target.checked } })} className="h-4 w-4 accent-accent" />
                      {s.label}
                    </label>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Links" description="Shown only if “Contact links” is public." />
            <CardBody className="grid gap-3">
              {[
                ['linkedin', 'LinkedIn', 'https://linkedin.com/in/…'],
                ['github', 'GitHub', 'https://github.com/…'],
                ['website', 'Website', 'https://…'],
                ['email', 'Email', 'you@example.com'],
              ].map(([key, label, ph]) => (
                <Field key={key} id={`pf-${key}`} label={label} optional error={errors[key]}>
                  <input id={`pf-${key}`} type={key === 'email' ? 'email' : 'url'} value={settings.links[key]} onChange={setLink(key)} placeholder={ph} className={inputClass(errors[key])} aria-describedby={describedBy(`pf-${key}`, errors[key])} />
                </Field>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Certificates & achievements"
              icon={Award}
              action={
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => setAddingCert(true)}>
                  Add
                </Button>
              }
            />
            <CardBody>
              {settings.certificates.length ? (
                <ul className="space-y-2">
                  {settings.certificates.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">{c.name}</span>
                        <span className="block text-xs text-muted">{[c.issuer, c.date].filter(Boolean).join(' · ') || 'Self-reported'}</span>
                      </span>
                      <Button size="xs" variant="ghost" icon={Trash2} onClick={() => set({ certificates: settings.certificates.filter((x) => x.id !== c.id) })} aria-label={`Remove ${c.name}`} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Hackathons, certifications, scholarships, competitive programming ranks…</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Public link" icon={Globe2} />
            <CardBody>
              {!canPublish ? (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Publishing needs an account (Firebase), because a public page has to be hosted somewhere. Your preview and the PDF report work now.
                </p>
              ) : (
                <>
                  <Field id="pf-slug" label="Link" error={slugError} hint="Lowercase letters, numbers and hyphens.">
                    <div className="flex items-center gap-1">
                      <span className="shrink-0 text-xs text-muted">{window.location.host}/p/</span>
                      <input id="pf-slug" value={settings.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} placeholder={suggestSlug(settings.displayName)} className={inputClass(slugError)} disabled={settings.published} aria-describedby={describedBy('pf-slug', slugError, 'hint')} />
                    </div>
                  </Field>
                  {settings.published ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-ink">
                        Published{settings.publishedAt ? ` ${new Date(settings.publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}.{' '}
                        <a href={publicUrl} target="_blank" rel="noreferrer noopener" className="font-medium underline">
                          Open
                        </a>
                      </p>
                      {outdated && <p className="text-xs font-medium text-warning-700">Your public page shows an older version.</p>}
                      <div className="flex flex-wrap gap-2">
                        {outdated && (
                          <Button size="sm" icon={RefreshCw} onClick={publish} loading={busy === 'publish'}>
                            Update public page
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Copy}
                          onClick={() =>
                            navigator.clipboard?.writeText(publicUrl).then(
                              () => toast.success('Link copied'),
                              () => toast.error('Couldn’t copy the link'),
                            )
                          }
                        >
                          Copy link
                        </Button>
                        <Button size="sm" variant="ghost" icon={EyeOff} onClick={() => setConfirmUnpublish(true)}>
                          Unpublish
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button className="mt-3" icon={Globe2} onClick={publish} loading={busy === 'publish'}>
                      Publish portfolio
                    </Button>
                  )}
                  <p className="mt-3 text-xs text-muted">The public page is a snapshot of the checked sections. Anyone with the link can see it until you unpublish.</p>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <p className="mb-2 text-xs font-medium text-muted">Preview: what visitors will see</p>
          <PortfolioView data={snapshot} level={2} />
        </div>
      </div>

      <CertificateModal open={addingCert} onClose={() => setAddingCert(false)} onSave={(c) => set({ certificates: [...settings.certificates, c] })} />
      <ConfirmDialog
        open={confirmUnpublish}
        onClose={() => setConfirmUnpublish(false)}
        onConfirm={unpublish}
        loading={busy === 'unpublish'}
        tone="danger"
        title="Unpublish your portfolio?"
        description="The public link stops working immediately. You can publish again later."
        confirmLabel="Unpublish"
      />
    </div>
  );
};

export default Portfolio;
