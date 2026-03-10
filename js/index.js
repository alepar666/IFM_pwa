import * as constants from './constants.js';

export let fetchedStations = [];
export let audioContext;
let currentAppVersion = 'unknown';

const channelButtons = [
    document.getElementById(constants.CBS_BUTTON_ID),
    document.getElementById(constants.DF_BUTTON_ID),
    document.getElementById(constants.TDM_BUTTON_ID)
];

// cache management for new version release
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered', reg))
            .catch(err => console.warn('SW registration failed', err));
    });
}

window.addEventListener('DOMContentLoaded', () => {

    setTimeout(async () => {
        await fetchStations();

        if (!audioContext) {
            audioContext = new(window.AudioContext || window.webkitAudioContext)();
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        }

        // prevents pinch-zoom on iOS
        document.addEventListener('gesturestart', e => e.preventDefault());
        document.addEventListener('gesturechange', e => e.preventDefault());
        document.addEventListener('gestureend', e => e.preventDefault());

    }, 50);

    fetchAppVersion();
    updateScrollingText();
    refreshScrollingTextAnimation();

    channelButtons.forEach(btn => btn.disabled = false);

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

export async function fetchStations() {
    try {
        const response = await fetch(constants.STATIONS_JSON_URL, {
            cache: "no-store"
        });
        if (!response.ok) {
            displayMessage(`Unable to load the playlist: ${response.status} - ${response.statusText}`);
            return;
        }

        const stationsJson = await response.json();
        const [cbsInfo, dfInfo, tdmInfo] = stationsJson.stations;

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

        displayMessage(constants.SYSTEM_READY_MSG);
    } catch (err) {
        displayMessage(`Error fetching stations: ${err}`);
        console.error(err);
    }
}

// fetch version.json
export async function fetchAppVersion() {
    try {
        const response = await fetch('/version.json', {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error('Failed to fetch version.json');
        const data = await response.json();
        currentAppVersion = data.app_version || 'unknown';
    } catch (err) {
        console.warn('Could not fetch app version:', err);
    }
    updateScrollingText(); // aggiorna subito lo scrolling
}

export function updateScrollingText(customText) {
    const baseText = customText || constants.DEFAULT_SCROLLING_TEXT;
    const fullText = `${baseText} - v${currentAppVersion}`;
    setScrollingText(fullText);
}

export function setScrollingText(textForScrolling) {
    document.getElementsByClassName(constants.IFMX_SCROLL_TEXT_CLASS_NAME)[0].innerHTML = textForScrolling;
}

function refreshScrollingTextAnimation() {
    const el = document.getElementsByClassName(constants.IFMX_SCROLL_TEXT_CLASS_NAME)[0];
    el.style.animation = constants.NONE;
    void el.offsetWidth; // trigger reflow per restart animazione
    el.style.animation = constants.EMPTY_VAL;
}

export function displayMessage(message) {
    feedHTML(constants.DISPLAY_MESSAGE_BOX_ID, message);
}

export function feedHTML(elementId, value) {
    document.getElementById(elementId).innerHTML = value;
}

export function showElement(element) {
    element.style.display = constants.BLOCK;
}
export function hideElement(element) {
    element.style.display = constants.NONE;
}
