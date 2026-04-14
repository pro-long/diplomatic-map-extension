// hook.js - Webpack Deep Interceptor

console.log("[DiploOS] Injecting Webpack Trap...");

const TARGET_LAYERS = ['country-fill', 'region-fill', 'inner-country-fill'];
let hookedMap = null;
let originalColors = {};
let activeDiploHandler = null;

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
                            let origModule = modules[moduleId];
                            let moduleCode = origModule.toString();

                            if (moduleCode.includes('getLayer') && moduleCode.includes('addSource')) {
                                console.log("[DiploOS] Intercepting Map Engine chunk!");

                                modules[moduleId] = function(module, exports, __webpack_require__) {
                                    origModule(module, exports, __webpack_require__);

                                    let targetObj = exports.default?.Map ? exports.default : module.exports;

                                    if (targetObj?.Map) {
                                        const OriginalMap = targetObj.Map;
                                        targetObj.Map = function(...args) {
                                            const mapInstance = new OriginalMap(...args);
                                            hookedMap = mapInstance; 
                                            return mapInstance;
                                        };
                                        targetObj.Map.prototype = OriginalMap.prototype;
                                    }
                                };
                            }
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

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DIPLO_TOGGLE') {
        
        if (event.data.active && hookedMap) {
            console.log("[DiploOS] Activating Tactical View...");

            // Save original colors
            TARGET_LAYERS.forEach(layer => {
                if (hookedMap.getLayer(layer) && !originalColors[layer]) {
                    originalColors[layer] = hookedMap.getPaintProperty(layer, 'fill-color');
                }
            });

            // Handle Click
            activeDiploHandler = (e) => {
                if (!e.features || !e.features.length) return;

                const props = e.features[0].properties;
                const clickedId = props.countryId || props.initialCountryId || props.id; 

                if (!clickedId) return;
                
                console.log(`[DiploOS] Clicked ID: ${clickedId}`);

                const colorExpression = [
                    'match',
                    ['coalesce', ['get', 'countryId'], ['get', 'initialCountryId'], ['get', 'id']],
                    clickedId, '#3498db', // Selected color
                    '#1a1a1a' // Neutral fallback
                ];

                TARGET_LAYERS.forEach(layer => {
                    if (hookedMap.getLayer(layer)) hookedMap.setPaintProperty(layer, 'fill-color', colorExpression);
                });
            };

            hookedMap.on('click', 'country-fill', activeDiploHandler);

            // Set initial dark theme
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
// // hook.js - Webpack Deep Interceptor

// console.log("[DiploOS Hook] Injecting Next.js Webpack Trap...");

// let hookedMap = null;

// function installWebpackHook() {
//     let _webpackChunk = [];

//     // 1. Trap the Next.js Webpack array
//     Object.defineProperty(window, 'webpackChunk_N_E', {
//         get: function() { return _webpackChunk; },
//         set: function(newVal) {
//             _webpackChunk = newVal;

//             // 2. Intercept the 'push' method where new code is loaded
//             const originalPush = _webpackChunk.push;
//             _webpackChunk.push = function(chunkArray) {
//                 try {
//                     const modules = chunkArray[1]; // Index 1 contains all the module functions
                    
//                     if (modules) {
//                         for (let moduleId in modules) {
//                             let origModule = modules[moduleId];
//                             let moduleCode = origModule.toString();

//                             // 3. Scan the code for MapLibre/Mapbox fingerprints
//                             if (moduleCode.includes('getLayer') && 
//                                 moduleCode.includes('addSource') && 
//                                 moduleCode.includes('flyTo')) {
                                
//                                 console.log("[DiploOS Hook] Found the Map Engine chunk!", moduleId);

//                                 // 4. Wrap the module to intercept its exports
//                                 modules[moduleId] = function(module, exports, __webpack_require__) {
                                    
//                                     // Let the game compile the module normally
//                                     origModule(module, exports, __webpack_require__);

//                                     // 5. Hunt for the 'Map' class inside the compiled exports
//                                     let targetObj = exports;
//                                     if (exports.default && exports.default.Map) targetObj = exports.default;
//                                     else if (module.exports && module.exports.Map) targetObj = module.exports;

//                                     // 6. Hijack the constructor!
//                                     if (targetObj && targetObj.Map) {
//                                         console.log("[DiploOS Hook] Hijacked Map Constructor successfully!");
//                                         const OriginalMap = targetObj.Map;

//                                         targetObj.Map = function(...args) {
//                                             console.log("[DiploOS Hook] GAME IS SPAWNING THE MAP!");
//                                             const mapInstance = new OriginalMap(...args);
                                            
//                                             // CAPTURE IT
//                                             hookedMap = mapInstance;
//                                             window.__DIPLO_MAP__ = mapInstance; // Save globally just in case
                                            
//                                             return mapInstance;
//                                         };
//                                         targetObj.Map.prototype = OriginalMap.prototype;
//                                     }
//                                 };
//                             }
//                         }
//                     }
//                 } catch (e) {
//                     console.error("[DiploOS Hook] Interception error:", e);
//                 }
                
//                 // Allow Next.js to continue loading the chunk
//                 return originalPush.apply(this, arguments);
//             };
//         },
//         configurable: true
//     });
// }

// // Plant the trap immediately
// installWebpackHook();

// // Listen for the UI toggle
// window.addEventListener('message', (event) => {
//     if (event.data && event.data.type === 'DIPLO_TOGGLE') {
//         if (event.data.active) {
            
//             // Backup check: If the Webpack hook failed but it leaked to window somehow
//             if (!hookedMap && window.__DIPLO_MAP__) {
//                 hookedMap = window.__DIPLO_MAP__;
//             }

//             if (hookedMap) {
//                 // Success!
//                 window.postMessage({ 
//                     type: 'DIPLO_STATUS', 
//                     success: true, 
//                     zoom: Math.round(hookedMap.getZoom()) 
//                 }, '*');
//             } else {
//                 console.warn("[DiploOS Hook] Map trap empty. Next.js chunks bypassed us.");
//                 window.postMessage({ type: 'DIPLO_STATUS', success: false }, '*');
//             }
//         } else {
//             window.postMessage({ type: 'DIPLO_STATUS', success: false, msg: 'offline' }, '*');
//         }
//     }
// });


// // Store the game's original colors so we can restore them when you turn the switch off
// let originalColors = {};
// let activeDiploHandler = null; // Stores our click event

// window.addEventListener('message', (event) => {
//     if (event.data && event.data.type === 'DIPLO_TOGGLE') {
        
//         if (!hookedMap && window.__DIPLO_MAP__) hookedMap = window.__DIPLO_MAP__;

//         if (event.data.active) {
//             if (hookedMap) {
//                 console.log("[DiploOS Hook] Activating Tactical Diplomacy View...");

//                 // 1. The specific layers we want to hijack from your console log
//                 const targetLayers = ['country-fill', 'region-fill', 'inner-country-fill'];

//                 // 2. Save the original game colors
//                 targetLayers.forEach(layer => {
//                     if (hookedMap.getLayer(layer) && !originalColors[layer]) {
//                         originalColors[layer] = hookedMap.getPaintProperty(layer, 'fill-color');
//                     }
//                 });

//                 // 3. Create the Click Handler for your UI
//                 activeDiploHandler = (e) => {
//                     if (!e.features || e.features.length === 0) return;

//                     // Grab the ID of the country you just clicked
//                     const props = e.features[0].properties;
//                     // The game might use one of these keys for the ID
//                     const clickedId = props.countryId || props.initialCountryId || props.id; 

//                     if (!clickedId) return;
//                     console.log(`[DiploOS Hook] Clicked Country ID: ${clickedId}`, props);

//                     // --- YOUR DIPLOMACY LOGIC GOES HERE ---
//                     // This is the exact MapLibre Match Expression from your original project!
//                     const colorExpression = [
//                         'match',
//                         // Tell MapLibre which property to check
//                         ['coalesce', ['get', 'countryId'], ['get', 'initialCountryId'], ['get', 'id']],
                        
//                         // If it matches the clicked ID, paint it Selected (Blue)
//                         clickedId, '#3498db', 
                        
//                         // FUTURE STEP: Add your arrays of Allies and Enemies here!
//                         // e.g., ...alliesArray.flatMap(id => [id, '#2ecc71']), // Green
//                         // e.g., ...warsArray.flatMap(id => [id, '#e74c3c']),   // Red
                        
//                         // Fallback color for everyone else (Dark Grey OS Theme)
//                         '#1a1a1a' 
//                     ];

//                     // Apply your colors to the map layers
//                     targetLayers.forEach(layer => {
//                         if (hookedMap.getLayer(layer)) {
//                             hookedMap.setPaintProperty(layer, 'fill-color', colorExpression);
//                         }
//                     });
//                 };

//                 // 4. Attach your click event to the live game map
//                 hookedMap.on('click', 'country-fill', activeDiploHandler);

//                 // 5. Apply the Dark Theme immediately when turned on
//                 targetLayers.forEach(layer => {
//                     if (hookedMap.getLayer(layer)) {
//                         hookedMap.setPaintProperty(layer, 'fill-color', '#1a1a1a');
//                     }
//                 });

//                 window.postMessage({ type: 'DIPLO_STATUS', success: true, zoom: Math.round(hookedMap.getZoom()) }, '*');
//             }
//         } else {
//             // --- WHEN TURNED OFF ---
//             if (hookedMap) {
//                 console.log("[DiploOS Hook] Restoring original game map...");
//                 const targetLayers = ['country-fill', 'region-fill', 'inner-country-fill'];
                
//                 // Restore the original colors
//                 targetLayers.forEach(layer => {
//                     if (hookedMap.getLayer(layer) && originalColors[layer]) {
//                         hookedMap.setPaintProperty(layer, 'fill-color', originalColors[layer]);
//                     }
//                 });

//                 // Remove your custom click listener
//                 if (activeDiploHandler) {
//                     hookedMap.off('click', 'country-fill', activeDiploHandler);
//                     activeDiploHandler = null;
//                 }
//             }
//             window.postMessage({ type: 'DIPLO_STATUS', success: false, msg: 'offline' }, '*');
//         }
//     }
// });