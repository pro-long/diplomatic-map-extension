# WarEra Diplomacy OS

**WarEra Diplomacy OS** is a high-performance, stealthy Chrome extension designed for the browser-based strategy game [WarEra](https://app.warera.io). It provides a real-time, interactive tactical overlay by intercepting game data and rendering a custom **"Ghost Layer"** directly onto the game’s MapLibre engine.

---

## Demo
![WarEra Diplomacy OS Demo]("./assets/extension_demo.gif")
*Real-time tactical overlay showing diplomatic relations and alliance mappings directly on the game engine.*

---

## Core Architecture & Technical Pillars

The extension utilizes a sophisticated "man-in-the-middle" architecture to bypass the complexities of modern React/Next.js applications and MapLibre rendering without modifying the game's core state.

### 1. Passive Data Interceptor (`window.fetch` Override)
To minimize footprint and avoid redundant network requests, the extension hijacks the browser's native `window.fetch` function.
* **Mechanism:** It silently monitors Next.js tRPC batch requests.
* **Intelligence Gathering:** When it detects `country.getAllCountries`, it clones the JSON response to build a fast-lookup dictionary (`globalCountryData`).
* **Benefit:** Provides real-time tactical data without triggering anti-cheat mechanisms via anomalous request patterns.

### 2. Zero-Overhead Webpack Hook ("Object Sniffer")
Since standard DOM queries cannot access the map engine (Deck.GL/MapLibre), the extension uses an object-level interception strategy.
* **Mechanism:** The extension intercepts `webpackChunk_N_E` at the moment of module execution.
* **Extraction:** It performs a micro-check on the resulting object to locate the MapLibre constructor and capture the `mapInstance`.
* **Benefit:** Achieves map interception with minimal impact on game boot times or FPS.

### 3. The "Ghost Layer" & Cloaking Device
Modifying native game layers can cause React state desynchronization and router crashes.
* **Execution:** The OS clones the game's native layers (`diplo-country-fill`) and applies tactical colors only to the clones, leaving the native map untouched.
* **Stealth:** It intercepts MapLibre’s internal functions like `queryRenderedFeatures` and `getStyle` to hide these "Ghost Layers" from the game’s own logic.
* **Benefit:** Enables total visual customization with high stability.

---

## Features

* **Native UI Injection:** Uses a `MutationObserver` to inject a "Diplomacy Tactical OS" toggle directly into the game's settings menu, perfectly mimicking native React styling.
* **Tactical Color Mapping:**
    * 🟨 **Yellow:** Selected Country
    * 🟧 **Orange:** Active Battles
    * 🟥 **Red:** Wars / Enemies
    * 🟦 **Blue:** Allies
    * 🟪 **Purple:** Non-Aggression Pacts (NAP)
    * ⬛ **Dark Grey:** Neutral / Uninvolved

---

## File Structure & Inter-World Communication

The extension is split across two "Isolated Worlds" to manage security and access.

* **`manifest.json` (V3):** Defines permissions and script injection points.
* **`ui.js` (Isolated World):**
    * Handles UI injection and `MutationObserver` logic.
    * Acts as a **"data smuggler,"** fetching the local `naps.json` (which the Main World cannot access) and sending it to `hook.js` via `window.postMessage`.
* **`hook.js` (Main World):**
    * The core engine running in the game's execution context to access internal variables.
    * Contains the fetch interceptor, Webpack sniffer, Ghost Layer logic, and MapLibre coloring engine.
* **`naps.json`:** A local JSON dictionary containing Non-Aggression Pact data.

---

## Acknowledgments
This project was inspired by the architectural concepts and vision of the [WarEra Tactical Diplomacy OS](https://francescoparadiso.github.io/warera-tactical-diplomacy-os/) by Francesco Paradiso.

---

## License
This project is licensed under the MIT License - see the [LICENSE]("./LICENSE") file for details.