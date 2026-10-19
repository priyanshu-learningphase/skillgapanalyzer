/**
 * Public, read-only portfolio page at /p/:slug. No sign-in required.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Logo from '../components/layout/Logo';
import PortfolioView from '../components/portfolio/PortfolioView';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Spinner } from '../components/ui/Spinner';
import { getPublicPortfolio } from '../services/portfolioService';

const PublicPortfolio = () => {
  const { slug } = useParams();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let alive = true;
    getPublicPortfolio(slug)
      .then((data) => alive && setState({ status: data ? 'ready' : 'missing', data, error: null }))
      .catch((err) => alive && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    document.title = state.data?.displayName ? `${state.data.displayName} · Portfolio` : 'Portfolio · SkillGap';
  }, [state.data]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-12">
        {state.status === 'loading' ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : state.status === 'ready' ? (
          <PortfolioView data={state.data} />
        ) : state.status === 'missing' ? (
          <div className="card">
            <EmptyState title="This portfolio isn’t available" description="The link may be wrong, or its owner has unpublished it." />
          </div>
        ) : (
          <div className="card">
            <ErrorState title="Couldn’t load this portfolio" description={state.error} />
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicPortfolio;
