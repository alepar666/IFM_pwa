import * as constants from './constants.js';

// Array to store the fetched station data from the server
export let fetchedStations = [];
// Global AudioContext reference for audio processing
export let audioContext;
// Current app version, fetched from version.json
let currentAppVersion = 'unknown';

// References to the channel buttons in the DOM
const channelButtons = [
    document.getElementById(constants.CBS_BUTTON_ID),
    document.getElementById(constants.DF_BUTTON_ID),
    document.getElementById(constants.TDM_BUTTON_ID)
];

// Service Worker registration for caching and offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered', reg))
            .catch(err => console.warn('SW registration failed', err));
    });
}

// Setup event listeners and initialization after DOM content loaded
window.addEventListener('DOMContentLoaded', () => {

    setTimeout(async () => {
        // Fetch station list from server
        await fetchStations();

        // Initialize AudioContext if not already initialized
        if (!audioContext) {
            audioContext = new(window.AudioContext || window.webkitAudioContext)();
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        }

        // Prevent pinch-zoom gestures on iOS
        document.addEventListener('gesturestart', e => e.preventDefault());
        document.addEventListener('gesturechange', e => e.preventDefault());
        document.addEventListener('gestureend', e => e.preventDefault());

    }, 50); // slight delay to ensure DOM elements exist

    // Fetch the app version from version.json
    fetchAppVersion();
    // Update scrolling text immediately
    updateScrollingText();
    // Restart the scrolling text animation
    refreshScrollingTextAnimation();

    // Enable all channel buttons
    channelButtons.forEach(btn => btn.disabled = false);

    // Bind click events for external links
    document.getElementById(constants.DONATE_LINK_ID).addEventListener(constants.CLICK_EVENT_NAME,
        () => {
            window.location.href = constants.DONATE_URL;
        });
    document.getElementById(constants.WEBSITE_LINK_ID).addEventListener(constants.CLICK_EVENT_NAME,
        () => {
            window.location.href = constants.WEBSITE_URL;
        });
    document.getElementById(constants.ARCHIVE_LINK_ID).addEventListener(constants.CLICK_EVENT_NAME,
        () => {
            window.location.href = constants.ARCHIVE_URL;
        });
});

// Fetch the list of stations from a JSON file
export async function fetchStations() {
    try {
        const response = await fetch(constants.STATIONS_JSON_URL, {
            cache: "no-store" // prevent caching to always get latest
        });
        if (!response.ok) {
            displayMessage(`Unable to load the playlist: ${response.status} - ${response.statusText}`);
            return;
        }

        // Parse JSON response
        const stationsJson = await response.json();
        const [cbsInfo, dfInfo, tdmInfo] = stationsJson.stations;

        // Populate the fetchedStations array with formatted station objects
        fetchedStations = [
            {
                title: cbsInfo.name,
                src: cbsInfo.url,
                howl: null
            },
            {
                title: dfInfo.name,
                src: dfInfo.url,
                howl: null
            },
            {
                title: tdmInfo.name,
                src: tdmInfo.url,
                howl: null
            }
        ];

        // Notify that the system is ready
        displayMessage(constants.SYSTEM_READY_MSG);
    } catch (err) {
        displayMessage(`Error fetching stations: ${err}`);
        console.error(err);
    }
}

// Fetch the current app version from version.json
export async function fetchAppVersion() {
    try {
        const response = await fetch('version.json', {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error('Failed to fetch version.json');
        const data = await response.json();
        currentAppVersion = data.app_version || 'unknown';
    } catch (err) {
        console.warn('Could not fetch app version:', err);
    }
    // Update scrolling text immediately after fetching version
    updateScrollingText();
}

// Update scrolling text element with optional custom text
export function updateScrollingText(customText) {
    const baseText = customText || constants.DEFAULT_SCROLLING_TEXT;
    const fullText = `${baseText} - v${currentAppVersion}`; // append version
    setScrollingText(fullText);
}

// Set the text inside the scrolling text element
export function setScrollingText(textForScrolling) {
    document.getElementsByClassName(constants.IFMX_SCROLL_TEXT_CLASS_NAME)[0].innerHTML = textForScrolling;
}

// Restart the scrolling text animation by forcing a reflow
function refreshScrollingTextAnimation() {
    const el = document.getElementsByClassName(constants.IFMX_SCROLL_TEXT_CLASS_NAME)[0];
    el.style.animation = constants.NONE; // temporarily disable animation
    void el.offsetWidth; // force reflow to reset animation
    el.style.animation = constants.EMPTY_VAL; // re-enable animation
}

export function showHomeUI() {
    hideElement(document.getElementsByClassName(constants.CLOSE)[0]);
    hideElement(document.getElementById(constants.TRACK_INFO_MODAL_ID));
    showElement(document.getElementById(constants.CONTAINER_ID));
}

export function showNowPlayingUI() {
    const modal = document.getElementById(constants.TRACK_INFO_MODAL_ID);
    const homeContainer = document.getElementById(constants.CONTAINER_ID);
    const stopButton = document.getElementsByClassName(constants.CLOSE)[0];

    if (homeContainer) hideElement(homeContainer);
    if (modal) showElement(modal);
    if (stopButton) showElement(stopButton);
}

// Display a message in the designated message box
export function displayMessage(message) {
    feedHTML(constants.DISPLAY_MESSAGE_BOX_ID, message);
}

// Set innerHTML of an element by its ID
export function feedHTML(elementId, value) {
    document.getElementById(elementId).innerHTML = value;
}

// Show a DOM element by setting its display property
export function showElement(element) {
    element.style.display = constants.BLOCK;
}

// Hide a DOM element by setting its display property
export function hideElement(element) {
    element.style.display = constants.NONE;
}
