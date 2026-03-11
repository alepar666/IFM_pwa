Intergalactic FM - PWA

Intergalactic FM is a Progressive Web App (PWA) for streaming the three radio stations of Intergalactic FM directly from
your browser, without using official app stores. It supports now-playing notifications, lockscreen media controls, and a
mobile-optimized interface.

⸻

Key Features
• Audio streaming of three stations:
• CYBERNETIC BROADCASTING SYSTEM
• DISCO FETISH
• THE DREAM MACHINE
• Scrolling “Now Playing” text with real-time updates.
• Native audio controls via lockscreen on iOS and Android.
• PWA mode: add the app to your home screen.
• Quick links to the official website, donations, and archive.

⸻

Folder Structure
www/
├─ index.html
├─ css/
│ └─ index.css
├─ js/
│ ├─ constants.js
│ ├─ index.js
│ └─ audio.js
├─ img/
│ ├─ icon.png
│ ├─ icon100.png
│ ├─ favicon.ico
│ ├─ cbs.png
│ ├─ df.png
│ └─ tdm.png
├─ manifest.json
└─ service-worker.js (optional)

⸻

Local Testing

To test the PWA locally (necessary on iOS/Android due to CORS restrictions):
1. Open a terminal and navigate to the www folder.
2. Start a local server (requires Node.js): (bash -> npx serve)
3. Open a browser on the same device and go to: http://localhost:3000
Note: On iPhone, you can use the same Wi-Fi network as your computer and access the local server via your computer’s
IP (e.g., http://192.168.x.x:5000).

⸻

Installation on iPhone
1. Open Safari and navigate to the PWA (e.g., http://localhost:5000 or the public HTTPS URL).
2. Tap the Share button (square with arrow pointing up).
3. Select Add to Home Screen.
4. The PWA will be installed as a standalone app with an icon and full-screen launch.
5. Once launched, the app can use lockscreen controls and display scrolling “Now Playing” text.

iOS requires HTTPS for some advanced features (notifications, secure fetch), but HTTP works for local demo purposes.

Installation on Android
1. Open Chrome (or a compatible browser) and navigate to the PWA.
2. You will see a banner saying Add to Home Screen, or open the browser menu and select Add to Home Screen.
3. The app will appear as a standalone icon and support lockscreen controls, autoplay, and scrolling text.

⸻

Usage
• Tap one of the three stations to start streaming.
• Tap the ↵ button to stop the audio and return to the main screen.
• Scrolling text shows information about the currently playing track.
• @ WEBSITE, $ DONATE, [-] ARCHIVE buttons open the corresponding links.

⸻

Technical Notes
• All scripts use ES Modules (type="module").
• Native HTML5 audio ensures iOS/Android compatibility without app stores.
• The PWA can work partially offline for static assets (optional: add a service worker).

⸻

Audio App Documentation (Combined)

Global State
------------

- fetchedStations: Array holding all radio stations fetched from the server.
- audioContext: Global AudioContext instance used to prewarm and play audio.
- currentAppVersion: Holds the current app version, fetched from version.json.
- currentNowPlayingUrl: URL for fetching the “Now Playing” JSON for the selected channel.
- nowPlayingRequestTimer: Timer ID used for adaptive polling of now-playing information.
- selectedChannel: Index of the currently selected channel.
- previousTrackHash: Hash string combining last track title and image to detect changes.
- AUDIO_PLAYER: Reference to the <audio> element in the DOM.
- nowPlayingFetching: Boolean flag to prevent overlapping now-playing fetches.
- Polling intervals:
    - fastPollingInterval: Interval for initial fast polling of now-playing info.
    - slowPollingInterval: Interval used after a delay for slower polling.
    - errorPollingInterval: Interval used if a fetch fails.
    - slowPollingDelay: Delay after which fast polling switches to slow polling.
- pollingInterval: Current polling interval in use.
- pollingSwitchTimer: Timer used to switch from fast to slow polling.
- isPageVisible: Boolean indicating if the page is currently visible (affects polling).

DOM Elements
------------

- channelButtons: Cached references to channel selection buttons in the DOM.
- Stop button, modal, home container: Cached DOM elements used to show/hide UI sections.

Initialization
--------------

- DOMContentLoaded:
    - Binds click events for channel buttons to playChannel().
    - Binds the stop button to stop() and reset().
    - Initializes the <audio> element with an empty source to prewarm playback.
    - Prevents pinch-zoom gestures on iOS.
    - Fetches stations and app version on startup.
    - Updates scrolling text and restarts animation.
    - Enables channel buttons and external links (donate, website, archive).

- Service Worker registration:
    - Registers sw.js for cache management and offline support.

Station Fetching
----------------

- fetchStations():
    - Fetches station data from the server (stations.json).
    - Maps server response to fetchedStations array with title, src, and howl.
    - Displays system ready message or error if fetching fails.

- fetchAppVersion():
    - Fetches version.json to get app_version.
    - Updates the scrolling text immediately with the new version.

Scrolling Text
--------------

- updateScrollingText(customText):
    - Builds the text shown in the scrolling ticker, appending the app version.
- setScrollingText(textForScrolling):
    - Updates the DOM element holding the scrolling text.
- refreshScrollingTextAnimation():
    - Forces a reflow to restart the CSS animation of the scrolling text.

Audio Playback
--------------

- stop():
    - Stops playback, clears the audio source, and reloads the audio element.
    - Re-attaches MediaSession listeners for play/pause events.

- playChannel(channelNumber):
    - Stops previous playback and disables channel buttons.
    - Shows modal and hides home container.
    - Sets audio source to the selected station, adding a timestamp query param to avoid caching issues.
    - Starts playback, sets MediaSession commands, and resets now-playing metadata.
    - Sets adaptive polling: fast polling initially, then switches to slow after a delay.
    - Handles errors gracefully and re-enables buttons.

- addAudioEventListeners(audioPlayer):
    - Hooks into MediaSession to update playback state (playing or paused).

Now Playing
-----------

- getNowPlaying():
    - Fetches now-playing metadata from currentNowPlayingUrl.
    - Uses fetchWithTimeout() to abort requests that take too long.
    - Avoids concurrent fetches with nowPlayingFetching flag.
    - Fallback to default metadata if the fetch fails or data is invalid.
    - Updates track metadata and UI only if the track has changed.
    - Reschedules the next poll based on pollingInterval.

- fetchWithTimeout(url, timeout):
    - Helper to fetch a URL with an abort signal after a specified timeout.

- setTrackMetadata(trackMetadata):
    - Splits metadata into artist, title, album, label, year, and country.
    - Updates nowPlayingMetadatas object.
    - Updates MediaSession metadata for lockscreen display.
    - Updates scrolling text for additional info.

- feedNowPlaying(nowPlayingMetadata):
    - Updates the main UI and modal with now-playing information.
    - Updates track cover image with fallback if unavailable.

- getCoverHTMLfromUrl(image_url):
    - Returns an <img> HTML string with error handling for missing images.

MediaSession / Lockscreen
-------------------------

- setLockscreenTrackCommands():
    - Sets previous/next track handlers using MediaSession API.
    - Calls playChannel() with the correct index when user interacts with lockscreen controls.

UI Helpers
----------

- displayMessage(message): Shows a message in the display message box.
- feedHTML(elementId, value): Updates the inner HTML of a given element.
- showElement(element) / hideElement(element): Show or hide DOM elements using display style.

Reset Function
--------------

- reset():
    - Clears all now-playing metadata from the UI.
    - Clears polling timers.
    - Resets selected channel and page title.
    - Hides modals and shows the home container.
    - Re-fetches stations and updates scrolling text.
    - Re-enables channel buttons visually and functionally.