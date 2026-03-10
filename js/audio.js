import * as constants from './constants.js';
import {
    feedHTML,
    showElement,
    hideElement,
    displayMessage,
    fetchedStations,
    setScrollingText,
    fetchStations,
    audioContext,
    updateScrollingText
} from './index.js';

let currentNowPlayingUrl;
let nowPlayingRequestTimer;
let selectedChannel;
let previousTrackHash = constants.EMPTY_VAL;
let AUDIO_PLAYER;

let fastPollingInterval = 5000;
let pollingInterval = fastPollingInterval;
let slowPollingInterval = 10000;
let slowPollingDelay = 20000;
let pollingSwitchTimer;
let isPageVisible = true;

const channelButtons = [
    document.getElementById(constants.CBS_BUTTON_ID),
    document.getElementById(constants.DF_BUTTON_ID),
    document.getElementById(constants.TDM_BUTTON_ID)
];

window.addEventListener('DOMContentLoaded', () => {
    // bind channel buttons
    channelButtons[0].addEventListener(constants.CLICK_EVENT_NAME, () => playChannel(0));
    channelButtons[1].addEventListener(constants.CLICK_EVENT_NAME, () => playChannel(1));
    channelButtons[2].addEventListener(constants.CLICK_EVENT_NAME, () => playChannel(2));

    // bind stop button
    document.getElementById(constants.STOP_BUTTON_ID).addEventListener(constants.CLICK_EVENT_NAME, () => {
        stop();
        reset();
    });

    AUDIO_PLAYER = document.getElementById('player');
    // prewarm audio player
    if (AUDIO_PLAYER) {
        AUDIO_PLAYER.src = ''; // src vuoto per inizializzare
        AUDIO_PLAYER.load();
    }

    if (isTouchDevice()) {
        channelButtons.forEach(btn => {
            btn.style.userSelect = 'none';
            btn.style.webkitUserSelect = 'none';
            btn.style.msUserSelect = 'none';
            btn.style.MozUserSelect = 'none';
        });
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            // slow down polling when lockscreen
            pollingInterval = sleepyPollingInterval;
            isPageVisible = false;
        } else {
            // resume polling
            if (!isPageVisible && currentNowPlayingUrl) {
                isPageVisible = true;
                getNowPlaying();
            }

        }
    });
});

// stop audio player
export function stop() {
    if (AUDIO_PLAYER) {
        AUDIO_PLAYER.pause();
        AUDIO_PLAYER.src = '';
    }
}

function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

function disableChannelButtons() {
    channelButtons.forEach(b => b.disabled = true);
}

function enableChannelButtons() {
    channelButtons.forEach(b => b.disabled = false);
}

// play channel stream
export async function playChannel(channelNumber) {
    disableChannelButtons();

    const modal = document.getElementById(constants.TRACK_INFO_MODAL_ID);
    const homeContainer = document.getElementById(constants.CONTAINER_ID);
    const stopButton = document.getElementsByClassName(constants.CLOSE)[0];

    if (homeContainer) hideElement(homeContainer);
    if (modal) showElement(modal);
    if (stopButton) showElement(stopButton);

    if (!fetchedStations || fetchedStations.length === 0) {
        fetchStations().catch(err => {
            console.error("Fetch stations failed:", err);
        });
    }

    const station = fetchedStations[channelNumber];
    if (!station || !station.src) {
        displayMessage('Station not available');
        enableChannelButtons();
        return;
    }

    try {
        selectedChannel = channelNumber;
        AUDIO_PLAYER.src = station.src;
        AUDIO_PLAYER.load();

        AUDIO_PLAYER.play().catch(err => {
            console.warn("Audio play failed:", err);
        });

        setLockscreenTrackCommands();
        addAudioEventListeners(AUDIO_PLAYER);

        // reset now playing hash
        clearTimeout(nowPlayingRequestTimer);
        previousTrackHash = constants.EMPTY_VAL;

        displayMessage(constants.LOADING_MSG + station.title + "...");

        // fetch NowPlaying in background
        currentNowPlayingUrl = constants.NOW_PLAYING_REQUEST_PREFIX + station.title;

        // adaptive polling: start fast
        pollingInterval = fastPollingInterval;

        // after 30s switch to slow polling
        clearTimeout(pollingSwitchTimer);
        pollingSwitchTimer = setTimeout(() => {
            pollingInterval = slowPollingInterval;
        }, slowPollingDelay);
        getNowPlaying();

    } catch (error) {
        console.error("Error playing channel:", error);
        displayMessage(`Error while loading ${station.title}: No audio stream received.`);
    } finally {
        enableChannelButtons();
    }
}

// event listener for MediaSession
function addAudioEventListeners(audioPlayer) {
    if (constants.MEDIASESSION_NAME in navigator) {
        audioPlayer.addEventListener(constants.PLAY_ACTION_NAME, () => {
            navigator.mediaSession.playbackState = 'playing';
        });
        audioPlayer.addEventListener(constants.PAUSE_ACTION_NAME, () => {
            navigator.mediaSession.playbackState = 'paused';
        });
    }
}

// fetch now playing
async function getNowPlaying() {
    let trackMetadata;
    try {
        const response = await fetch(currentNowPlayingUrl);
        if (!response.ok) {
            trackMetadata = setDefaultNowPlayingInfo();
        } else {
            trackMetadata = await response.json();
            if (!trackMetadata || typeof trackMetadata.title !== 'string') {
                trackMetadata = setDefaultNowPlayingInfo();
            } else {
                trackMetadata.title = fixEncoding(trackMetadata.title);
                if (!trackMetadata.image_file) {
                    trackMetadata.image_file = constants.DEFAULT_IMAGE_NOT_FOUND;
                }
            }
        }
    } catch (error) {
        console.warn("NowPlaying API error:", error);
        trackMetadata = setDefaultNowPlayingInfo();
    }

    const metaDataHash = trackMetadata.title + trackMetadata.image_file;
    if (previousTrackHash !== metaDataHash) {
        setTrackMetadata(trackMetadata);
        previousTrackHash = metaDataHash;
        feedNowPlaying(trackMetadata);
    }

    nowPlayingRequestTimer = setTimeout(getNowPlaying, pollingInterval);
}

function fixEncoding(str) {
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

function setDefaultNowPlayingInfo() {
    return {
        title: "No info received from Mothership.",
        image_file: constants.DEFAULT_IMAGE_NOT_FOUND
    };
}

let nowPlayingMetadatas = {
    artist: "",
    title: "",
    album: "",
    label: "",
    year: "",
    country: "",
    artwork_url: ""
};

function setTrackMetadata(trackMetadata) {
    if (!trackMetadata || typeof trackMetadata.title !== "string") return;

    const trackMetadatas = trackMetadata.title.split(constants.METADATA_SPLIT_CHAR);
    let artist = trackMetadatas[0] || '';
    let title = '';

    const splitString = constants.ARTIST_TITLE_SPLIT_STRING || ' - ';
    if (artist && artist.includes(splitString)) {
        const parts = artist.split(splitString);
        artist = parts[0].trim();
        title = parts[1].trim();
    }

    nowPlayingMetadatas.artist = artist;
    nowPlayingMetadatas.title = title;
    nowPlayingMetadatas.album = trackMetadatas[1] ? trackMetadatas[1].trim() : '';
    nowPlayingMetadatas.label = trackMetadatas[2] ? trackMetadatas[2].trim() : '';
    nowPlayingMetadatas.year = trackMetadatas[3] ? trackMetadatas[3].trim() : '';
    nowPlayingMetadatas.country = trackMetadatas[4] ? trackMetadatas[4].trim() : '';
    nowPlayingMetadatas.artwork_url = trackMetadata.image_file || constants.DEFAULT_IMAGE_NOT_FOUND;

    setScrollingText(trackMetadatas[5] || constants.DEFAULT_SCROLLING_TEXT || '');

    const coverPath = constants.COVER_PATH_ARRAY && constants.COVER_PATH_ARRAY[selectedChannel] ?
        constants.COVER_PATH_ARRAY[selectedChannel] :
        constants.DEFAULT_IMAGE_NOT_FOUND;

    if (constants.MEDIASESSION_NAME in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: artist,
            album: nowPlayingMetadatas.album,
            artwork: [{
                src: coverPath
            }]
        });
    }
}

function setLockscreenTrackCommands() {
    if (constants.MEDIASESSION_NAME in navigator) {
        const previousIndex = selectedChannel === 0 ? 2 : (selectedChannel - 1);
        const nextIndex = selectedChannel === 2 ? 0 : (selectedChannel + 1);

        navigator.mediaSession.setActionHandler(constants.PREVIOUS_TRACK_ACTION_NAME, previousIndex !== undefined ? () => playChannel(previousIndex) : null);
        navigator.mediaSession.setActionHandler(constants.NEXT_TRACK_ACTION_NAME, nextIndex !== undefined ? () => playChannel(nextIndex) : null);
    }
}

export function feedNowPlaying(nowPlayingMetadata) {
    const meta = nowPlayingMetadata || {};
    const main = `${nowPlayingMetadatas.artist}${constants.ARTIST_TITLE_SPLIT_STRING}${nowPlayingMetadatas.title}`;
    const otherInfo = `${nowPlayingMetadatas.album || ''}${nowPlayingMetadatas.label ? constants.ARTIST_TITLE_SPLIT_STRING + nowPlayingMetadatas.label : ''}${nowPlayingMetadatas.year ? constants.LINE_BREAK + nowPlayingMetadatas.year : ''}${nowPlayingMetadatas.country ? ', ' + nowPlayingMetadatas.country : ''}`;

    feedHTML(constants.NOW_PLAYING_DIV_ID, main);
    feedHTML(constants.NOW_PLAYING_DIV_EXT_ID, otherInfo);
    feedHTML(constants.NOW_PLAYING_COVER_DIV_ID, getCoverHTMLfromUrl(meta.image_file || constants.DEFAULT_IMAGE_NOT_FOUND));

    const modal = document.getElementById(constants.TRACK_INFO_MODAL_ID);
    const homeContainer = document.getElementById(constants.CONTAINER_ID);
    const stopButton = document.getElementsByClassName(constants.CLOSE)[0];

    if (homeContainer) hideElement(homeContainer);
    if (modal) showElement(modal);
    if (stopButton) showElement(stopButton);
}

function getCoverHTMLfromUrl(image_url) {
    return `<img src="${image_url}" style="width:90%" onerror="this.src='${constants.DEFAULT_IMAGE_NOT_FOUND}'; this.onerror=null;">`;
}

export function reset() {
    feedHTML(constants.NOW_PLAYING_DIV_ID, constants.EMPTY_VAL);
    feedHTML(constants.NOW_PLAYING_DIV_EXT_ID, constants.EMPTY_VAL);
    feedHTML(constants.NOW_PLAYING_COVER_DIV_ID, constants.EMPTY_VAL);
    clearTimeout(nowPlayingRequestTimer);
    clearTimeout(pollingSwitchTimer);
    previousTrackHash = constants.EMPTY_VAL;
    selectedChannel = constants.EMPTY_VAL;
    document.title = constants.PAGE_TITLE_DEFAULT;
    hideElement(document.getElementsByClassName(constants.CLOSE)[0]);
    hideElement(document.getElementById(constants.TRACK_INFO_MODAL_ID));
    fetchStations();
    updateScrollingText();
    showElement(document.getElementById(constants.CONTAINER_ID));
    channelButtons.forEach(btn => btn.classList.remove(constants.IS_DISABLED_CSS_CLASS));
}
