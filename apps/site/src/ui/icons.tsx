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
export const SunIcon = () => <Icon d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />;
export const MoonIcon = () => <Icon d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />;
export const MicIcon = () => <Icon d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4" />;
export const SendIcon = () => <Icon d="M12 19V5M6 11l6-6 6 6" />;
export const PhoneOffIcon = () => <Icon d="M4 15.5c4.5-4 11.5-4 16 0l-2 2.5-3-1.5v-2.5a10 10 0 0 0-6 0v2.5L6 18z" />;
export const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />;
