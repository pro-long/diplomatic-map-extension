function injectUI() {
    if (document.getElementById('diplomacy-os-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'diplomacy-os-panel';
    panel.innerHTML = `
        <div class="dip-header">
            <h3 class="dip-title">DIPLO-OS</h3>
            <label class="switch">
                <input type="checkbox" id="dip-toggle">
                <span class="slider"></span>
            </label>
        </div>
        <div id="dip-status">> Initialization pending...</div>
    `;

    document.body.appendChild(panel);

    // Listen for the toggle switch
    document.getElementById('dip-toggle').addEventListener('change', (e) => {
        const statusText = document.getElementById('dip-status');
        
        if (e.target.checked) {
            statusText.innerText = "> Requesting map access...";
            statusText.style.color = "#f1c40f"; // Yellow
            // Ask the hook script if it caught the map
            window.postMessage({ type: 'DIPLO_TOGGLE', active: true }, '*');
        } else {
            window.postMessage({ type: 'DIPLO_TOGGLE', active: false }, '*');
        }
    });
}

// Listen for answers from the hook script
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DIPLO_STATUS') {
        const statusText = document.getElementById('dip-status');
        
        if (event.data.msg === 'offline') {
            statusText.innerText = "> System Offline.";
            statusText.style.color = "#aaa"; 
        } else if (event.data.success) {
            statusText.innerText = `> Map Hooked! (Zoom: ${event.data.zoom})`;
            statusText.style.color = "#2ecc71"; // Green
        } else {
            statusText.innerText = "> ERROR: Map trap empty.";
            statusText.style.color = "#e74c3c"; // Red
            document.getElementById('dip-toggle').checked = false; 
        }
    }
});

// Run UI injection
setTimeout(injectUI, 3000);