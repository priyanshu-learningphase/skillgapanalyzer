import { ScanSearch, Target } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { EmptyState } from '../ui/States';

/** Shown on any page that needs an analysis when the user hasn't done one. */
export const NoAnalysisState = ({ title = 'No career selected yet', description = 'Pick a target role and add your skills to see your readiness, gaps and roadmap.' }) => (
  <Card>
    <EmptyState
      icon={Target}
      title={title}
      description={description}
      action={
        <Button to="/onboarding" icon={ScanSearch}>
          Analyze Skills
        </Button>
      }
      secondaryAction={
        <Button to="/careers" variant="secondary">
          Explore career paths
        </Button>
      }
    />
  </Card>
);

export default NoAnalysisState;
