import type { StoredWidget } from './widget.js';
import type { GiveawayRecord } from './giveaway.js';
import type { StageDesign } from './design.js';
import type { ThemeEntry } from './theme.js';
import type { NowPlayingOverlay } from './nowplaying.js';

/** Published, authorized record data. Private channel identifiers and widget tokens are removed. */
export interface RecordDataMap {
  widget: Omit<StoredWidget, 'key' | 'channelId'>;
  giveaway: Omit<GiveawayRecord, 'channelId'>;
  alert_design: StageDesign;
  theme: ThemeEntry;
  nowplaying: NowPlayingOverlay;
}
export type WidgetRecordData = RecordDataMap['widget'];
export type GiveawayRecordData = RecordDataMap['giveaway'];
export type AlertDesignRecordData = RecordDataMap['alert_design'];
export type ThemeRecordData = RecordDataMap['theme'];
export type NowPlayingRecordData = RecordDataMap['nowplaying'];
export type * from './nowplaying.js';
