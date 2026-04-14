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