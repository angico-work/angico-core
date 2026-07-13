import type { ReactElement } from 'react';
import type { IconName } from '../types';

const PATHS: Record<IconName, ReactElement> = {
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </>
  ),
  warning: (
    <>
      <path d="m10.29 3.86-8.47 14.14A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  people: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16.5 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  sprout: (
    <>
      <path d="M7 20h10" />
      <path d="M12 20c0-4.5 0-6 0-7" />
      <path d="M12 13C8 13 5 11 5 7c4 0 7 2 7 6Z" />
      <path d="M12 13c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5Z" />
    </>
  ),
  map: (
    <>
      <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2Z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  observation: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  mission: (
    <>
      <path d="M4 15s1.2-1 4-1 4.8 2 8 2 4-1 4-1V4s-1 1-4 1-5.2-2-8-2-4 1-4 1Z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </>
  ),
  action: (
    <>
      <path d="M11 6h10" />
      <path d="M11 12h10" />
      <path d="M11 18h10" />
      <path d="m3 6 1.4 1.4L7 4.8" />
      <path d="m3 12 1.4 1.4L7 10.8" />
      <path d="m3 18 1.4 1.4L7 16.8" />
    </>
  ),
  indicator: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="10" width="3" height="7" rx="1" />
      <rect x="10.5" y="6" width="3" height="11" rx="1" />
      <rect x="15" y="13" width="3" height="4" rx="1" />
    </>
  ),
  memory: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7.5V12l3.5 2" />
    </>
  ),
  report: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </>
  ),
  tree: (
    <>
      <path d="M8 19a4 4 0 0 1-1.9-7.5A4 4 0 0 1 12 5a4 4 0 0 1 5.9 6.5A4 4 0 0 1 16 19Z" />
      <path d="M12 19v3" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  cloud: <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9.5a3 3 0 0 1 5.6 1c0 2-3 2.5-3 4" />
      <path d="M12 18h.01" />
    </>
  ),
  exit: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  message: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  )
};

export function icon(name: string): ReactElement {
  return (
    <svg
      className="ic"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name as IconName] ?? PATHS.target}
    </svg>
  );
}
