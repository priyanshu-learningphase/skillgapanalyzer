import { ClipboardCheck, FlaskConical } from 'lucide-react';
import Tabs from '../ui/Tabs';

/** Switch between auto-graded quizzes and the practical verification lab. */
const AssessmentTabs = () => (
  <Tabs
    items={[
      { to: '/assessments', label: 'Quizzes', icon: ClipboardCheck, end: true },
      { to: '/assessments/lab', label: 'Practical lab', icon: FlaskConical },
    ]}
  />
);

export default AssessmentTabs;
