import { Briefcase, Shuffle, Compass } from 'lucide-react';
import Tabs from '../ui/Tabs';

const JobsTabs = () => (
  <Tabs
    items={[
      { to: '/jobs', label: 'Job match', icon: Briefcase, end: true },
      { to: '/jobs/simulator', label: 'Career simulator', icon: Shuffle },
      { to: '/careers', label: 'Role matches', icon: Compass },
    ]}
  />
);

export default JobsTabs;
