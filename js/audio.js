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

// Current URL for fetching now-playing info
let currentNowPlayingUrl;
// Timer for scheduling next now-playing fetch
let nowPlayingRequestTimer;
// Currently selected channel index
let selectedChannel;
// Previous track hash to detect changes in now-playing metadata
let previousTrackHash = constants.EMPTY_VAL;
// Reference to the HTML audio element
let AUDIO_PLAYER;

// Polling intervals for adaptive now-playing requests
let fastPollingInterval = 5000; // 5 seconds
let pollingInterval = fastPollingInterval;
let slowPollingInterval = 10000; // 10 seconds
let errorPollingInterval = 30000; // 30 seconds if errors occur
let slowPollingDelay = 20000; // Delay before switching to slow polling
let pollingSwitchTimer;
// Flag indicating if the page is currently visible
let isPageVisible = true;
// Flag to prevent concurrent now-playing fetches
let nowPlayingFetching = false;

// References to channel buttons in the DOM
const channelButtons = [
    document.getElementById(constants.CBS_BUTTON_ID),
    document.getElementById(constants.DF_BUTTON_ID),
    document.getElementById(constants.TDM_BUTTON_ID)
];

// Setup event listeners after DOM content is loaded
window.addEventListener('DOMContentLoaded', function () {
    // Bind each channel button to play the corresponding channel
    channelButtons[0].addEventListener(constants.CLICK_EVENT_NAME, function () {
        playChannel(0);
    });
    channelButtons[1].addEventListener(constants.CLICK_EVENT_NAME, function () {
        playChannel(1);
    });
    channelButtons[2].addEventListener(constants.CLICK_EVENT_NAME, function () {
        playChannel(2);
    });

    // Bind stop button to stop playback and reset UI
    document.getElementById(constants.STOP_BUTTON_ID).addEventListener(constants.CLICK_EVENT_NAME, function () {
        stop();
        reset();
    });

    // Initialize audio player reference
    AUDIO_PLAYER = document.getElementById('player');
    if (AUDIO_PLAYER) {
        AUDIO_PLAYER.src = ''; // Start with empty source
        AUDIO_PLAYER.load();
    }

    // Disable text selection on touch devices for channel buttons
    if (isTouchDevice()) {
        for (var i = 0; i < channelButtons.length; i++) {
            var btn = channelButtons[i];
            btn.style.userSelect = 'none';
            btn.style.webkitUserSelect = 'none';
            btn.style.msUserSelect = 'none';
            btn.style.MozUserSelect = 'none';
        }
    }

    // Handle visibility change to throttle polling when the tab is hidden
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            pollingInterval = slowPollingDelay;
            isPageVisible = false;
        } else {
            clearTimeout(nowPlayingRequestTimer);
            if (!isPageVisible && currentNowPlayingUrl) {
                isPageVisible = true;
                getNowPlaying();
            }
        }
    });
});

// Stop audio playback and reset the player
export function stop() {
    if (AUDIO_PLAYER) {
        AUDIO_PLAYER.pause();
        AUDIO_PLAYER.removeAttribute("src");
        AUDIO_PLAYER.load();
        addAudioEventListeners(AUDIO_PLAYER);
    }
}

// Detect if the device supports touch
function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

// Disable all channel buttons to prevent multiple clicks
function disableChannelButtons() {
    for (var i = 0; i < channelButtons.length; i++) {
        channelButtons[i].disabled = true;
    }
}

// Enable all channel buttons
function enableChannelButtons() {
    for (var i = 0; i < channelButtons.length; i++) {
        channelButtons[i].disabled = false;
    }
}

// Play a specific channel by index
export async function playChannel(channelNumber) {
    stop();
    disableChannelButtons();

    // Show/hide relevant UI elements for now-playing info
    var modal = document.getElementById(constants.TRACK_INFO_MODAL_ID);
    var homeContainer = document.getElementById(constants.CONTAINER_ID);
    var stopButton = document.getElementsByClassName(constants.CLOSE)[0];

    if (homeContainer) hideElement(homeContainer);
    if (modal) showElement(modal);
    if (stopButton) showElement(stopButton);

    // Ensure stations are loaded
    if (!fetchedStations || fetchedStations.length === 0) {
        fetchStations().catch(function (err) {
            console.error("Fetch stations failed:", err);
        });
    }

    var station = fetchedStations[channelNumber];
    if (!station || !station.src) {
        displayMessage('Station not available');
        enableChannelButtons();
        return;
    }

    try {
        selectedChannel = channelNumber;
        AUDIO_PLAYER.src = station.src + "?t=" + Date.now(); // prevent caching
        AUDIO_PLAYER.load();

        AUDIO_PLAYER.play().catch(function (err) {
            console.warn("Audio play failed:", err);
        });

        // Setup lockscreen media controls
        setLockscreenTrackCommands();

        clearTimeout(nowPlayingRequestTimer);
        previousTrackHash = constants.EMPTY_VAL;

        displayMessage(constants.LOADING_MSG + station.title + "...");

        // Set now-playing URL for adaptive polling
        currentNowPlayingUrl = constants.NOW_PLAYING_REQUEST_PREFIX + station.title;

        pollingInterval = fastPollingInterval;

        // Switch to slower polling after a delay
        clearTimeout(pollingSwitchTimer);
        pollingSwitchTimer = setTimeout(function () {
            pollingInterval = slowPollingInterval;
        }, slowPollingDelay);

        // Start fetching now-playing metadata
        getNowPlaying();
    } catch (error) {
        console.error("Error playing channel:", error);
        displayMessage("Error while loading " + station.title + ": No audio stream received.");
    } finally {
        enableChannelButtons();
    }
}

// Add MediaSession event listeners for play/pause actions
function addAudioEventListeners(audioPlayer) {
    if (constants.MEDIASESSION_NAME in navigator) {
        audioPlayer.addEventListener(constants.PLAY_ACTION_NAME, function () {
            navigator.mediaSession.playbackState = 'playing';
        });
        audioPlayer.addEventListener(constants.PAUSE_ACTION_NAME, function () {
            navigator.mediaSession.playbackState = 'paused';
        });
    }
}

// Fetch now-playing metadata from the server
async function getNowPlaying() {
    if (nowPlayingFetching) return;
    nowPlayingFetching = true;

    var trackMetadata;
    try {
        var response = await fetchWithTimeout(currentNowPlayingUrl);
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
        pollingInterval = errorPollingInterval;
    } finally {
        nowPlayingFetching = false;
    }

    // Update track metadata if it changed
    var metaDataHash = trackMetadata.title + trackMetadata.image_file;
    if (previousTrackHash !== metaDataHash) {
        setTrackMetadata(trackMetadata);
        previousTrackHash = metaDataHash;
        feedNowPlaying(trackMetadata);
    }

    if (!currentNowPlayingUrl) return;
    nowPlayingRequestTimer = setTimeout(getNowPlaying, pollingInterval);
}

// Fetch wrapper with timeout using AbortController
async function fetchWithTimeout(url, timeout) {
    timeout = timeout || 4000;
    var controller = new AbortController();
    var id = setTimeout(function () {
        controller.abort();
    }, timeout);

    var response = await fetch(url, {
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

// Fix character encoding issues from server
function fixEncoding(str) {
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

// Default fallback metadata
function setDefaultNowPlayingInfo() {
    return {
        title: "No info received from Mothership.",
        image_file: constants.DEFAULT_IMAGE_NOT_FOUND
    };
}

// Object storing the current track metadata
var nowPlayingMetadatas = {
    artist: "",
    title: "",
    album: "",
    label: "",
    year: "",
    country: "",
    artwork_url: ""
};

// Parse and set track metadata from server response
function setTrackMetadata(trackMetadata) {
    if (!trackMetadata || typeof trackMetadata.title !== "string") return;

    var trackMetadatas = trackMetadata.title.split(constants.METADATA_SPLIT_CHAR);
    var artist = trackMetadatas[0] || '';
    var title = '';

    var splitString = constants.ARTIST_TITLE_SPLIT_STRING || ' - ';
    if (artist && artist.indexOf(splitString) >= 0) {
        var parts = artist.split(splitString);
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

    // Update scrolling text if available
    setScrollingText(trackMetadatas[5] || constants.DEFAULT_SCROLLING_TEXT || '');

    var coverPath = (constants.COVER_PATH_ARRAY && constants.COVER_PATH_ARRAY[selectedChannel]) ? constants.COVER_PATH_ARRAY[selectedChannel] : constants.DEFAULT_IMAGE_NOT_FOUND;

    // Update MediaSession metadata for lockscreen controls
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

// Setup previous/next track commands for MediaSession
function setLockscreenTrackCommands() {
    if (constants.MEDIASESSION_NAME in navigator) {
        var previousIndex = selectedChannel === 0 ? 2 : (selectedChannel - 1);
        var nextIndex = selectedChannel === 2 ? 0 : (selectedChannel + 1);

        navigator.mediaSession.setActionHandler(constants.PREVIOUS_TRACK_ACTION_NAME, previousIndex !== undefined ? function () {
            playChannel(previousIndex);
        } : null);
        navigator.mediaSession.setActionHandler(constants.NEXT_TRACK_ACTION_NAME, nextIndex !== undefined ? function () {
            playChannel(nextIndex);
        } : null);
    }
}

// Update the HTML UI with current now-playing info
export function feedNowPlaying(nowPlayingMetadata) {
    var meta = nowPlayingMetadata || {};
    var main = nowPlayingMetadatas.artist + constants.ARTIST_TITLE_SPLIT_STRING + nowPlayingMetadatas.title;
    var otherInfo = (nowPlayingMetadatas.album || '') +
        (nowPlayingMetadatas.label ? constants.ARTIST_TITLE_SPLIT_STRING + nowPlayingMetadatas.label : '') +
        (nowPlayingMetadatas.year ? constants.LINE_BREAK + nowPlayingMetadatas.year : '') +
        (nowPlayingMetadatas.country ? ', ' + nowPlayingMetadatas.country : '');

    feedHTML(constants.NOW_PLAYING_DIV_ID, main);
    feedHTML(constants.NOW_PLAYING_DIV_EXT_ID, otherInfo);
    feedHTML(constants.NOW_PLAYING_COVER_DIV_ID, getCoverHTMLfromUrl(meta.image_file || constants.DEFAULT_IMAGE_NOT_FOUND));

    var modal = document.getElementById(constants.TRACK_INFO_MODAL_ID);
    var homeContainer = document.getElementById(constants.CONTAINER_ID);
    var stopButton = document.getElementsByClassName(constants.CLOSE)[0];

    if (homeContainer) hideElement(homeContainer);
    if (modal) showElement(modal);
    if (stopButton) showElement(stopButton);
}

// Helper to generate cover image HTML
function getCoverHTMLfromUrl(image_url) {
    return '<img src="' + image_url + '" style="width:90%" onerror="this.src=\'' + constants.DEFAULT_IMAGE_NOT_FOUND + '\'; this.onerror=null;">';
}

// Reset player, UI, and timers
export function reset() {
    feedHTML(constants.NOW_PLAYING_DIV_ID, constants.EMPTY_VAL);
    feedHTML(constants.NOW_PLAYING_DIV_EXT_ID, constants.EMPTY_VAL);
    feedHTML(constants.NOW_PLAYING_COVER_DIV_ID, constants.EMPTY_VAL);
    clearTimeout(nowPlayingRequestTimer);
    clearTimeout(pollingSwitchTimer);
    currentNowPlayingUrl = null;
    previousTrackHash = constants.EMPTY_VAL;
    selectedChannel = constants.EMPTY_VAL;
    document.title = constants.PAGE_TITLE_DEFAULT;
    hideElement(document.getElementsByClassName(constants.CLOSE)[0]);
    hideElement(document.getElementById(constants.TRACK_INFO_MODAL_ID));
    fetchStations();
    updateScrollingText();
    showElement(document.getElementById(constants.CONTAINER_ID));
    for (var i = 0; i < channelButtons.length; i++) {
        channelButtons[i].classList.remove(constants.IS_DISABLED_CSS_CLASS);
    }
}
