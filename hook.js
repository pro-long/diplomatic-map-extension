// hook.js - High-Performance Webpack Object Sniffer
console.log("[DiploOS] Initializing High-Performance Webpack Hook...");

const TARGET_LAYERS = ['country-fill', 'region-fill', 'inner-country-fill'];
let hookedMap = null;
let originalColors = {};
let activeDiploHandler = null;

// --- 1. THE OPTIMIZED WEBPACK TRAP ---
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

                            // WE WRAP THE MODULE EXECUTION (Zero string-scanning overhead!)
                            modules[moduleId] = function(module, exports, __webpack_require__) {
                                // 1. Let Next.js run the code normally
                                origModule.call(this, module, exports, __webpack_require__);

                                // 2. Check the output (Extremely fast object property check)
                                let targetObj = exports;
                                if (exports.default && exports.default.Map) targetObj = exports.default;
                                else if (module.exports && module.exports.Map) targetObj = module.exports;

                                // 3. Look for MapLibre/Mapbox signature
                                if (targetObj && targetObj.Map && targetObj.Map.prototype && targetObj.Map.prototype.getLayer) {
                                    
                                    // Prevent double-hooking if Next.js reloads the module
                                    if (targetObj.Map.__isHooked) return;

                                    console.log("[DiploOS] SUCCESS: Map Engine caught by Object Sniffer!");
                                    const OriginalMap = targetObj.Map;
                                    
                                    // 4. Hijack the Constructor
                                    targetObj.Map = function(...args) {
                                        console.log("[DiploOS] GAME IS SPAWNING THE MAP!");
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

// Plant the trap
installWebpackHook();


// --- 2. THE DIPLOMACY CONTROLLER ---
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DIPLO_TOGGLE') {
        
        if (event.data.active && hookedMap) {
            console.log("[DiploOS] Activating Tactical View...");

            TARGET_LAYERS.forEach(layer => {
                if (hookedMap.getLayer(layer) && !originalColors[layer]) {
                    originalColors[layer] = hookedMap.getPaintProperty(layer, 'fill-color');
                }
            });

            activeDiploHandler = (e) => {
                if (!e.features || !e.features.length) return;

                const props = e.features[0].properties;
                const clickedId = props.countryId || props.initialCountryId || props.id; 

                if (!clickedId) return;
                console.log(`[DiploOS] Clicked ID: ${clickedId}`);

                const colorExpression = [
                    'match',
                    ['coalesce', ['get', 'countryId'], ['get', 'initialCountryId'], ['get', 'id']],
                    clickedId, '#3498db', // Selected Color
                    '#1a1a1a' // Neutral Color
                ];

                TARGET_LAYERS.forEach(layer => {
                    if (hookedMap.getLayer(layer)) hookedMap.setPaintProperty(layer, 'fill-color', colorExpression);
                });
            };

            hookedMap.on('click', 'country-fill', activeDiploHandler);

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