// ui.js - Native Game UI Integration
console.log("[DiploOS UI] Watching for settings menu...");

let isTacticalActive = false;

// The exact SVG checkmark the game uses for its toggles
const checkmarkSVG = `
    <div class="_1dnmndyatq" style="transform: none;">
        <div class="a6izou0 _1dnmndy285">
            <svg class="mdi-icon " width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style="width: 1em; overflow: visible; height: 1em; font-size: 120%; filter: drop-shadow(black 1px 1px 0px);"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"></path></svg>
        </div>
    </div>`;

// Function to handle the visual checkmark turning on and off
function updateDiploToggleVisuals(checkbox) {
    if (isTacticalActive) {
        checkbox.setAttribute('aria-checked', 'true');
        checkbox.setAttribute('data-headlessui-state', 'checked');
        checkbox.setAttribute('data-checked', '');
        checkbox.innerHTML = checkmarkSVG;
    } else {
        checkbox.setAttribute('aria-checked', 'false');
        checkbox.setAttribute('data-headlessui-state', '');
        checkbox.removeAttribute('data-checked');
        checkbox.innerHTML = ''; 
    }
}

// Function to inject our clone into the menu
function injectIntoSettings() {
    // If we already injected it, do nothing
    if (document.getElementById('diplo-os-control')) return;

    // 1. Find the "Disable transparency" text in the menu
    const labels = Array.from(document.querySelectorAll('label span'));
    const targetSpan = labels.find(span => span.textContent.trim() === 'Disable transparency');

    if (!targetSpan) return; // Menu isn't open

    // 2. Grab the whole row container for that button
    const targetContainer = targetSpan.closest('label').parentElement.parentElement;

    // 3. Clone the entire row so we get the exact same game styling!
    const newContainer = targetContainer.cloneNode(true);
    
    // 4. Modify the clone for our OS
    const checkbox = newContainer.querySelector('[role="checkbox"]');
    const label = newContainer.querySelector('label');
    const labelSpan = newContainer.querySelector('label span');

    checkbox.id = 'diplo-os-control';
    label.setAttribute('for', 'diplo-os-control');
    labelSpan.textContent = 'Diplomacy Tactical OS';
    labelSpan.style.color = '#00d4ff'; // Give our text a slight custom glow to stand out
    
    // Sync the visual state in case it was toggled earlier
    updateDiploToggleVisuals(checkbox);

    // 5. Add Click Logic to our new button
    const toggleWrapper = newContainer.children[0]; 
    toggleWrapper.style.cursor = 'pointer'; 
    
    toggleWrapper.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        isTacticalActive = !isTacticalActive;
        updateDiploToggleVisuals(checkbox);

        // Tell hook.js to change the map
        window.postMessage({ type: 'DIPLO_TOGGLE', active: isTacticalActive }, '*');
    });

    // 6. Insert it directly below the "Disable transparency" option
    targetContainer.insertAdjacentElement('afterend', newContainer);
}

// Set up a MutationObserver to watch the screen. 
// Every time a new HTML element appears (like a modal opening), we check if it's the settings menu.
const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            injectIntoSettings();
        }
    }
});

// Start watching the document body
observer.observe(document.body, { childList: true, subtree: true });

// Listen for errors from hook.js
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DIPLO_STATUS') {
        if (!event.data.success && event.data.msg !== 'offline') {
            // Hook failed, turn the switch off automatically
            isTacticalActive = false;
            const checkbox = document.getElementById('diplo-os-control');
            if (checkbox) updateDiploToggleVisuals(checkbox);
        }
    }
});