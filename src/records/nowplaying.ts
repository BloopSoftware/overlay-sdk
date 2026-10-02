// Generated from published server record DTOs by scripts/overlay-record-types.mjs.


/**
 * Now-playing overlay data returned by the overlay endpoint.
 * Designed for OBS Browser Source consumption (HTML or JSON).
 */
export interface NowPlayingOverlay {
    channelId: string;
    channelName: string;
    nowPlaying: NowPlayingTrack | null;
    upNext: UpNextTrack[];
    queueLength: number;
    updatedAt: string;
}

/**
 * Currently playing track info for overlay.
 * Only includes display-safe data (no URIs or internal IDs exposed).
 */
export interface NowPlayingTrack {
    title: string;
    artist: string;
    requester: string;
    durationMs: number;
    requestedAt: string;
}

/**
 * Up-next track info for overlay queue preview.
 */
export interface UpNextTrack {
    position: number;
    title: string;
    artist: string;
    requester: string;
}
