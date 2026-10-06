import { Code2, Server, Layout, Layers, BarChart3, Brain, Workflow, Shield, Gauge, Database, Smartphone, Cloud, PenTool } from 'lucide-react';

export const ROLE_ICONS = {
  'software-engineer': Code2,
  'backend-developer': Server,
  'frontend-developer': Layout,
  'fullstack-developer': Layers,
  'data-scientist': BarChart3,
  'ml-engineer': Brain,
  'devops-engineer': Workflow,
  'cybersecurity-engineer': Shield,
  'data-analyst': Gauge,
  'data-engineer': Database,
  'mobile-developer': Smartphone,
  'cloud-engineer': Cloud,
  custom: PenTool,
};

export const roleIcon = (roleId) => ROLE_ICONS[roleId] || PenTool;
