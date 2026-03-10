import * as constants from './constants.js';

export let fetchedStations = [];
export let audioContext;
let appVersion = "";

// quando il DOM è pronto
window.addEventListener('DOMContentLoaded', () => {
    if (!fetchedStations) {
        fetchStations();
    }

    updateScrollingText();
    refreshScrollingTextAnimation();

    // unlock iOS audio context
    if (!audioContext) {
        audioContext = new(window.AudioContext || window.webkitAudioContext)();
    }

    // previeni pinch-zoom su iOS
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());

    // page links actions
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

// fetch stazioni dal server IFM
export async function fetchStations() {
    try {
        const response = await fetch(constants.STATIONS_JSON_URL);
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

// rolling text
export function updateScrollingText(customText) {
    const baseText = customText || constants.DEFAULT_SCROLLING_TEXT;
    const fullText = baseText + " - v" + constants.APP_VERSION;
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

// messaggi
export function displayMessage(message) {
    feedHTML(constants.DISPLAY_MESSAGE_BOX_ID, message);
}

export function feedHTML(elementId, value) {
    document.getElementById(elementId).innerHTML = value;
}

// utilità per mostrare/nascondere elementi (modal)
export function showElement(element) {
    element.style.display = constants.BLOCK;
}
export function hideElement(element) {
    element.style.display = constants.NONE;
}
