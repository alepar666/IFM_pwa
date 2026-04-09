import * as constants from './constants.js';

// Global AudioContext reference for audio processing
export let audioContext;
// Current app version, fetched from version.json
let APP_VERSION = 'unknown';
let BUILD_NUMBER = 'unknown';
let BUILD_NAME = 'unknown';

// References to the channel buttons in the DOM
const channelButtons = [
    document.getElementById(constants.CBS_BUTTON_ID),
    document.getElementById(constants.DF_BUTTON_ID),
    document.getElementById(constants.TDM_BUTTON_ID)
];

// Service Worker registration + FORCE UPDATE (fix iOS PWA)
let refreshing = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        const basePath = window.location.pathname.replace(/[^\/]*$/, '');

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });

        try {
            const reg = await navigator.serviceWorker.register(`${basePath}sw.js`, {
                scope: basePath
            });

            if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });

            setInterval(() => {
                reg.update().catch(() => {});
            }, 60 * 60 * 1000);

        } catch (err) {
            console.warn('SW registration failed', err);
        }
    });
}


// Setup event listeners and initialization after DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        // Initialize AudioContext if not already initialized
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

    }, 50);
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

// Fetch the current app version from version.json
export async function fetchAppVersion() {
    try {
        const response = await fetch('version.json', {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error('Failed to fetch version.json');
        const data = await response.json();
        APP_VERSION = data.version || 'unknown';
        BUILD_NUMBER = data.build_number || 'unknown';
        BUILD_NAME = data.build_name || 'unknown';
    } catch (err) {
        console.warn('Could not fetch app version:', err);
    }
    // Update scrolling text immediately after fetching version
    updateScrollingText();
    displayMessage(constants.SYSTEM_READY_MSG);
}

// Update scrolling text element with optional custom text
export function updateScrollingText(customText) {
    const baseText = customText || constants.DEFAULT_SCROLLING_TEXT;
    const fullText = `${baseText} - v${APP_VERSION}`; // append version
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

function showBuildInfo() {
    if (!BUILD_NUMBER) return;
    const div = document.createElement("div");
    const d = new Date(BUILD_NUMBER);
    const pad = n => n.toString().padStart(2, '0');
    const formattedDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    div.innerText = "VERSION: "+ APP_VERSION + "\n BUILD NAME: " +BUILD_NAME+ " \n LAST UPDATE: " + formattedDate;
    div.style.position = "fixed";
    div.style.bottom = "10px";
    div.style.right = "10px";
    div.style.background = "black";
    div.style.color = "red";
    div.style.padding = "6px 10px";
    div.style.borderRadius = "6px";
    div.style.fontSize = "12px";
    div.style.zIndex = "9999";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

let tapCount = 0;
document.getElementById('headerImage').addEventListener('click', () => {
    tapCount++;
    if (tapCount >= 5) {
        showBuildInfo();
        tapCount = 0;
    }
    setTimeout(() => tapCount = 0, 2000);
});