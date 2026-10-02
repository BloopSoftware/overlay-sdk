// Generated from published server record DTOs by scripts/overlay-record-types.mjs.
import type { WidgetTheme } from './widget.js';
import type { StageDesign } from './design.js';

/** One theme as the draft, a snapshot and the editor hold it. */
export interface ThemeEntry {
    name: string;
    body: ThemeBody;
}

export interface ThemeBody {
    tokens: WidgetTheme;
    customCss?: string;
    designs?: StageDesign[];
}
