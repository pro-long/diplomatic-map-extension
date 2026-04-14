// hook.js - Data-Driven Diplomacy OS
console.log("[DiploOS] Initializing High-Performance Webpack Hook...");

const TARGET_LAYERS = ['country-fill', 'region-fill', 'inner-country-fill'];
let hookedMap = null;
let originalColors = {};
let activeDiploHandler = null;

// Global storage for the API data
let globalCountryData = {}; 

// --- 1. DATA FETCHING LOGIC ---
// --- 1. DATA FETCHING LOGIC ---
async function fetchDiplomacyData() {
    try {
        console.log("[DiploOS] Fetching live server data...");
        // Call the official WarEra API
        const response = await fetch('https://api2.warera.io/trpc/country.getAllCountries?batch=1');
        const data = await response.json();

        // THE FIX: Removed the `.json` that tRPC usually adds, matching your exact API response
        const countriesArray = data[0]?.result?.data || [];

        // Map the array into a fast-lookup dictionary
        globalCountryData = {};
        countriesArray.forEach(country => {
            globalCountryData[country._id] = {
                allies: country.allies || [],       // Blue
                enemies: country.warsWith || [],    // Red
                battles: country.enemy ? [country.enemy] : [] // Orange
            };
        });

        console.log(`[DiploOS] Intelligence gathered for ${countriesArray.length} countries.`);
        
        // Safety net: If it STILL says 0, this will print the raw data so we can see why!
        if (countriesArray.length === 0) {
            console.warn("[DiploOS] Data is still empty! Here is what the server returned:", data);
        }

    } catch (error) {
        console.error("[DiploOS] Failed to fetch intelligence data:", error);
    }
}


// --- 2. THE OPTIMIZED WEBPACK TRAP ---
function installWebpackHook() {
    let _webpackChunk = [];

    Object.defineProperty(window, 'webpackChunk_N_E', {
        get: () => _webpackChunk,
        set: (newVal) => {
            _webpackChunk = newVal;
            const originalPush = _webpackChunk.push;
            
            _webpackChunk.push = function(chunkArray) {
                try {
                    const modules = chunkArray[1]; 
                    if (modules) {
                        for (let moduleId in modules) {
                            const origModule = modules[moduleId];

                            modules[moduleId] = function(module, exports, __webpack_require__) {
                                origModule.call(this, module, exports, __webpack_require__);

                                let targetObj = exports.default?.Map ? exports.default : module.exports;

                                if (targetObj && targetObj.Map && targetObj.Map.prototype && targetObj.Map.prototype.getLayer) {
                                    if (targetObj.Map.__isHooked) return;

                                    console.log("[DiploOS] SUCCESS: Map Engine caught!");
                                    const OriginalMap = targetObj.Map;
                                    
                                    targetObj.Map = function(...args) {
                                        const mapInstance = new OriginalMap(...args);
                                        hookedMap = mapInstance; 
                                        return mapInstance;
                                    };
                                    
                                    targetObj.Map.prototype = OriginalMap.prototype;
                                    targetObj.Map.__isHooked = true;
                                }
                            };
                        }
                    }
                } catch (e) {
                    console.error("[DiploOS] Hook error:", e);
                }
                return originalPush.apply(this, arguments);
            };
        },
        configurable: true
    });
}

installWebpackHook();


// --- 3. THE DIPLOMACY CONTROLLER ---
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'DIPLO_TOGGLE') {
        
        if (event.data.active && hookedMap) {
            console.log("[DiploOS] Activating Tactical View...");

            // Fetch the live API data right as the OS is turned on
            await fetchDiplomacyData();

            // Save original game colors
            TARGET_LAYERS.forEach(layer => {
                if (hookedMap.getLayer(layer) && !originalColors[layer]) {
                    originalColors[layer] = hookedMap.getPaintProperty(layer, 'fill-color');
                }
            });

            // Handle Country Clicks
            // Handle Country Clicks
            activeDiploHandler = (e) => {
                if (!e.features || !e.features.length) return;

                const props = e.features[0].properties;
                const clickedId = props.countryId || props.initialCountryId || props.id; 

                if (!clickedId) return;

                const diploInfo = globalCountryData[clickedId] || { allies: [], enemies: [], battles: [] };
                console.log(`[DiploOS] Target ID: ${clickedId} | Allies: ${diploInfo.allies.length} | Wars: ${diploInfo.enemies.length}`);

                const colorExpression = [
                    'match',
                    ['coalesce', ['get', 'countryId'], ['get', 'initialCountryId'], ['get', 'id']]
                ];

                // Track IDs so we never pass duplicates to MapLibre
                const processedIds = new Set();

                // 1. Top Priority: Clicked Country -> Yellow
                colorExpression.push(clickedId, '#f1c40f');
                processedIds.add(clickedId);

                // 2. Second Priority: Active Battle -> Orange
                if (diploInfo.battles.length > 0) {
                    diploInfo.battles.forEach(id => {
                        if (!processedIds.has(id)) {
                            colorExpression.push(id, '#e67e22');
                            processedIds.add(id);
                        }
                    });
                }

                // 3. Third Priority: Enemies (warsWith) -> Red
                if (diploInfo.enemies.length > 0) {
                    diploInfo.enemies.forEach(id => {
                        if (!processedIds.has(id)) {
                            colorExpression.push(id, '#e74c3c');
                            processedIds.add(id);
                        }
                    });
                }

                // 4. Fourth Priority: Allies -> Blue
                if (diploInfo.allies.length > 0) {
                    diploInfo.allies.forEach(id => {
                        if (!processedIds.has(id)) {
                            colorExpression.push(id, '#3498db');
                            processedIds.add(id);
                        }
                    });
                }

                // 5. Fallback: Everyone Else -> Dark Grey Theme
                colorExpression.push('#1a1a1a'); 

                // Apply to map
                TARGET_LAYERS.forEach(layer => {
                    if (hookedMap.getLayer(layer)) hookedMap.setPaintProperty(layer, 'fill-color', colorExpression);
                });
            };
            
            hookedMap.on('click', 'country-fill', activeDiploHandler);

            // Turn map grey initially until they click something
            TARGET_LAYERS.forEach(layer => {
                if (hookedMap.getLayer(layer)) hookedMap.setPaintProperty(layer, 'fill-color', '#1a1a1a');
            });

            window.postMessage({ type: 'DIPLO_STATUS', success: true, zoom: Math.round(hookedMap.getZoom()) }, '*');
            
        } else if (!event.data.active && hookedMap) {
            console.log("[DiploOS] Restoring Original View...");
            
            TARGET_LAYERS.forEach(layer => {
                if (hookedMap.getLayer(layer) && originalColors[layer]) {
                    hookedMap.setPaintProperty(layer, 'fill-color', originalColors[layer]);
                }
            });

            if (activeDiploHandler) {
                hookedMap.off('click', 'country-fill', activeDiploHandler);
                activeDiploHandler = null;
            }
            window.postMessage({ type: 'DIPLO_STATUS', success: false, msg: 'offline' }, '*');
        } else {
            window.postMessage({ type: 'DIPLO_STATUS', success: false }, '*');
        }
    }
});