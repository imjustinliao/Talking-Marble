// Small line icons (24 px grid, 1.6 px stroke), drawn in currentColor.
import type { SVGProps } from 'react';

const Icon = ({ d, ...p }: { d: string } & SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}>
    <path d={d} />
  </svg>
);
export const CopyIcon = () => <Icon d="M9 9h10v10H9zM5 15V5h10" />;
export const CheckIcon = () => <Icon d="M5 12.5l4.5 4.5L19 7.5" />;
export const ArrowIcon = () => <Icon d="M5 12h14M13 6l6 6-6 6" />;
export const CodeIcon = () => <Icon d="M9 7l-5 5 5 5M15 7l5 5-5 5" />;
export const PlayIcon = () => <Icon d="M8 5.5v13l10.5-6.5z" />;
export const ResetIcon = () => <Icon d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.6h4.6" />;
export const LeftIcon = () => <Icon d="M15 5l-7 7 7 7" />;
export const RightIcon = () => <Icon d="M9 5l7 7-7 7" />;
export const CloseIcon = () => <Icon d="M6 6l12 12M18 6L6 18" />;
