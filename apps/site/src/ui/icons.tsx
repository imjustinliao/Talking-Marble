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
export const MicIcon = () => <Icon d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4" />;
export const SendIcon = () => <Icon d="M12 19V5M6 11l6-6 6 6" />;
export const PhoneOffIcon = () => <Icon d="M4 15.5c4.5-4 11.5-4 16 0l-2 2.5-3-1.5v-2.5a10 10 0 0 0-6 0v2.5L6 18z" />;
export const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />;
export const BookIcon = () => <Icon d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />;

/** Brand marks, filled (their own shapes, in currentColor). */
const Mark = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={d} /></svg>
);
export const GitHubIcon = () => <Mark d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />;
export const XIcon = () => <Mark d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78zm-1.08 16.18h1.7L7.4 4.73H5.58z" />;
