// hook.js - Data-Driven Diplomacy OS (Ghost Layer Edition)
console.log("[DiploOS] Initializing High-Performance Webpack Hook...");

const TARGET_LAYERS = ['country-fill', 'region-fill', 'inner-country-fill'];
let hookedMap = null;
let activeDiploHandler = null;

// Global storage for the API data
let globalCountryData = {}; 

// --- 1. DATA INTERCEPTION LOGIC (Passive Hook) ---
const originalFetch = window.fetch;

window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    try {
        const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0] instanceof Request ? args[0].url : '');
        
        if (requestUrl.includes('country.getAllCountries')) {
            console.log("[DiploOS] Intercepted country data stream! Analyzing payload...");
            
            const clone = response.clone();
            
            clone.json().then(data => {
                // 1. SMART BATCH PARSING
                const urlPath = requestUrl.split('/trpc/')[1]?.split('?')[0] || '';
                const endpoints = urlPath.split(',');
                const targetIndex = endpoints.indexOf('country.getAllCountries');

                if (targetIndex === -1) return; // Failsafe

                // 2. Grab exact data object
                let targetData = data[targetIndex]?.result?.data;

                // 3. Unwrap tRPC json formatting
                if (targetData && targetData.json) {
                    targetData = targetData.json;
                }

                // 4. Ensure array
                let countriesArray = [];
                if (Array.isArray(targetData)) {
                    countriesArray = targetData; 
                } else if (targetData && typeof targetData === 'object') {
                    countriesArray = Object.values(targetData);
                }

                if (countriesArray.length === 0) {
                    console.warn("[DiploOS] Target index found, but data is empty. Raw slice:", targetData);
                    return; 
                }

                // 5. Map into fast-lookup dictionary
                globalCountryData = {};
                countriesArray.forEach(country => {
                    if (!country || !country._id) return; 
                    
                    globalCountryData[country._id] = {
                        allies: country.allies || [],       // Blue
                        enemies: country.warsWith || [],    // Red
                        battles: country.enemy ? [country.enemy] : [] // Orange
                    };
                });
                
                console.log(`[DiploOS] Intelligence silently gathered for ${Object.keys(globalCountryData).length} countries from batch index [${targetIndex}]!`);
            }).catch(err => console.error("[DiploOS] Error parsing intercepted JSON:", err));
        }
    } catch(e) {
        console.error("[DiploOS] Fetch intercept error:", e);
    }
    
    return response;
};

// --- 2. THE OPTIMIZED WEBPACK INTERCEPT ---
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


// --- 3. THE DIPLOMACY CONTROLLER (Ghost Layers) ---
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DIPLO_TOGGLE') {
        
        if (event.data.active && hookedMap) {
            console.log("[DiploOS] Activating Tactical Ghost Layers...");

            // 1. Create Ghost Layers
            TARGET_LAYERS.forEach(layerId => {
                const origLayer = hookedMap.getLayer(layerId);
                if (origLayer) {
                    const ghostId = `diplo-${layerId}`;
                    
                    if (!hookedMap.getLayer(ghostId)) {
                        // Slide ghost layer right above the original
                        const style = hookedMap.getStyle();
                        const layerIndex = style.layers.findIndex(l => l.id === layerId);
                        let insertBeforeId = undefined;
                        if (layerIndex !== -1 && layerIndex + 1 < style.layers.length) {
                            insertBeforeId = style.layers[layerIndex + 1].id;
                        }

                        hookedMap.addLayer({
                            id: ghostId,
                            type: origLayer.type,
                            source: origLayer.source,
                            'source-layer': origLayer.sourceLayer,
                            paint: {
                                'fill-color': '#1a1a1a', 
                                'fill-opacity': 1 
                            }
                        }, insertBeforeId);
                    } else {
                        // Un-hide if it already exists
                        hookedMap.setLayoutProperty(ghostId, 'visibility', 'visible');
                        hookedMap.setPaintProperty(ghostId, 'fill-color', '#1a1a1a');
                    }
                }
            });

            // 2. Handle Country Clicks
            activeDiploHandler = (e) => {
                if (!e.features || !e.features.length) return;

                const props = e.features[0].properties;
                const clickedId = props.countryId || props.initialCountryId || props.id; 

                if (!clickedId) return;

                const diploInfo = globalCountryData[clickedId] || { allies: [], enemies: [], battles: [] };
                console.log(`[DiploOS] Target ID: ${clickedId} | Allies: ${diploInfo.allies.length} | Wars: ${diploInfo.enemies.length} | Enemy: ${diploInfo.battles.length > 0 ? diploInfo.battles[0] : 'None'}`);

                const colorExpression = [
                    'match',
                    ['coalesce', ['get', 'countryId'], ['get', 'initialCountryId'], ['get', 'id']]
                ];

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

                // 5. Fallback: Dark Grey Theme
                colorExpression.push('#1a1a1a'); 

                // Apply exclusively to Ghost Layers
                TARGET_LAYERS.forEach(layer => {
                    const ghostId = `diplo-${layer}`;
                    if (hookedMap.getLayer(ghostId)) {
                        hookedMap.setPaintProperty(ghostId, 'fill-color', colorExpression);
                    }
                });
            };
            
            // Listen to clicks on the original, native layer
            hookedMap.on('click', 'country-fill', activeDiploHandler);

            window.postMessage({ type: 'DIPLO_STATUS', success: true, zoom: Math.round(hookedMap.getZoom()) }, '*');
            
        } else if (!event.data.active && hookedMap) {
            console.log("[DiploOS] Restoring Original View (Hiding Ghosts)...");
            
            // Hide our clones, revealing the untouched game layers underneath
            TARGET_LAYERS.forEach(layer => {
                const ghostId = `diplo-${layer}`;
                if (hookedMap.getLayer(ghostId)) {
                    hookedMap.setLayoutProperty(ghostId, 'visibility', 'none');
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