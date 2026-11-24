/**
 * What the marble works with today (F-78, PLAT-01): the React component and the Web Component (any web framework
 * or plain HTML), so it runs on every device with a modern browser and in desktop apps built on web tech
 * (Electron, Tauri). Native ports follow PLAT-01 in docs/product.md; one is listed only once it ships, never "soon".
 */
export const FRAMEWORKS = ['React', 'Web Component'] as const;
export type Framework = (typeof FRAMEWORKS)[number];
export const DEVICES = ['Phones', 'Tablets', 'Laptops', 'Desktop apps'] as const;
