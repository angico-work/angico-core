import type { IconName } from '../types';

const ICONS: Record<IconName, string> = {
  leaf: '◒',
  warning: '⚠',
  target: '◎',
  people: '♙',
  sprout: '♧',
  map: '▱',
  observation: '⌾',
  mission: '▣',
  action: '☑',
  indicator: '▥',
  memory: '⟲',
  report: '▤',
  trash: '♲',
  tree: '♣',
  check: '✓',
  search: '⌕',
  bell: '♧',
  cloud: '☁',
  help: '?',
  exit: '↳'
};

export function icon(name: string): string {
  return ICONS[name as IconName] ?? '•';
}
