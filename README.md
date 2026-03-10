Intergalactic FM - PWA

Intergalactic FM is a Progressive Web App (PWA) for streaming the three radio stations of Intergalactic FM directly from your browser, without using official app stores. It supports now-playing notifications, lockscreen media controls, and a mobile-optimized interface.

⸻

Key Features
	•	Audio streaming of three stations:
	•	CYBERNETIC BROADCASTING SYSTEM
	•	DISCO FETISH
	•	THE DREAM MACHINE
	•	Scrolling “Now Playing” text with real-time updates.
	•	Native audio controls via lockscreen on iOS and Android.
	•	PWA mode: add the app to your home screen.
	•	Quick links to the official website, donations, and archive.

⸻

Folder Structure
www/
├─ index.html
├─ css/
│  └─ index.css
├─ js/
│  ├─ constants.js
│  ├─ index.js
│  └─ audio.js
├─ img/
│  ├─ icon.png
│  ├─ icon100.png
│  ├─ favicon.ico
│  ├─ cbs.png
│  ├─ df.png
│  └─ tdm.png
├─ manifest.json
└─ service-worker.js (optional)

⸻

Local Testing

To test the PWA locally (necessary on iOS/Android due to CORS restrictions):
	1.	Open a terminal and navigate to the www folder.
	2.	Start a local server (requires Node.js): (bash -> npx serve)
    3.  Open a browser on the same device and go to: http://localhost:3000
        Note: On iPhone, you can use the same Wi-Fi network as your computer and access the local server via your computer’s IP (e.g., http://192.168.x.x:5000).
        
⸻
    
Installation on iPhone
	1.	Open Safari and navigate to the PWA (e.g., http://localhost:5000 or the public HTTPS URL).
	2.	Tap the Share button (square with arrow pointing up).
	3.	Select Add to Home Screen.
	4.	The PWA will be installed as a standalone app with an icon and full-screen launch.
	5.	Once launched, the app can use lockscreen controls and display scrolling “Now Playing” text.

iOS requires HTTPS for some advanced features (notifications, secure fetch), but HTTP works for local demo purposes.

Installation on Android
	1.	Open Chrome (or a compatible browser) and navigate to the PWA.
	2.	You will see a banner saying Add to Home Screen, or open the browser menu and select Add to Home Screen.
	3.	The app will appear as a standalone icon and support lockscreen controls, autoplay, and scrolling text.

⸻

Usage
	•	Tap one of the three stations to start streaming.
	•	Tap the ↵ button to stop the audio and return to the main screen.
	•	Scrolling text shows information about the currently playing track.
	•	@ WEBSITE, $ DONATE, [-] ARCHIVE buttons open the corresponding links.
    
⸻

Technical Notes
	•	All scripts use ES Modules (type="module").
	•	Native HTML5 audio ensures iOS/Android compatibility without app stores.
	•	The PWA can work partially offline for static assets (optional: add a service worker).