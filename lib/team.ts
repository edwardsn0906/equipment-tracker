export interface TeamMember {
  name: string;
  color: string;
  gradient: string;
  iconPath: string;
  lucideIcon: string;
}

// Pulled directly from vdc-projects/index.html — names, colors, and SVG icon paths
export const VDC_TEAM: TeamMember[] = [
  {
    name: 'Noah Edwards',
    color: '#5b8dee',
    gradient: 'linear-gradient(90deg,#5b8dee,#7c5cbf)',
    iconPath: `<polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/>`,
    lucideIcon: 'Zap',
  },
  {
    name: 'Lisbeth Uraga-Velazquez',
    color: '#9b6df0',
    gradient: 'linear-gradient(90deg,#9b6df0,#6b3fcf)',
    iconPath: `<polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/>`,
    lucideIcon: 'Star',
  },
  {
    name: 'Lisa Atchison',
    color: '#38bdf8',
    gradient: 'linear-gradient(90deg,#38bdf8,#0284c7)',
    iconPath: `<path d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'/><path d='M9 18h6'/><path d='M10 22h4'/>`,
    lucideIcon: 'Lightbulb',
  },
  {
    name: 'Jon Garner',
    color: '#f5a623',
    gradient: 'linear-gradient(90deg,#f5a623,#e87c1e)',
    iconPath: `<path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'/>`,
    lucideIcon: 'Wrench',
  },
  {
    name: 'Daniel Rodriguez',
    color: '#3ecf8e',
    gradient: 'linear-gradient(90deg,#3ecf8e,#2fa876)',
    iconPath: `<line x1='4' y1='3' x2='4' y2='21'/><line x1='4' y1='21' x2='20' y2='21'/><line x1='4' y1='3' x2='20' y2='21'/><line x1='4' y1='17' x2='7' y2='17'/><line x1='4' y1='13' x2='7' y2='13'/><line x1='4' y1='9' x2='7' y2='9'/><line x1='9' y1='21' x2='9' y2='18'/><line x1='13' y1='21' x2='13' y2='18'/><line x1='17' y1='21' x2='17' y2='18'/>`,
    lucideIcon: 'Ruler',
  },
  {
    name: 'Chad Reichert',
    color: '#e05c6b',
    gradient: 'linear-gradient(90deg,#e05c6b,#c0394a)',
    iconPath: `<path d='m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z'/><path d='M5 20h14'/>`,
    lucideIcon: 'Crown',
  },
];

export const VDC_TEAM_NAMES = VDC_TEAM.map(m => m.name);

export function getMemberColor(name: string): string {
  return VDC_TEAM.find(m => m.name === name)?.color ?? '#5b8dee';
}

export function getMemberGradient(name: string): string {
  return VDC_TEAM.find(m => m.name === name)?.gradient ?? 'linear-gradient(90deg,#5b8dee,#7c5cbf)';
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
