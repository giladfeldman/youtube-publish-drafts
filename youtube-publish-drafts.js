(() => {
    // -----------------------------------------------------------------
    // CONFIG
    // -----------------------------------------------------------------
    const MODE = 'publish_drafts'; // 'publish_drafts' / 'sort_playlist'
    const DEBUG_MODE = true;

    // PUBLISH CONFIG
    const MADE_FOR_KIDS = false;   // true / false
    const VISIBILITY = 'Unlisted'; // 'Public' / 'Private' / 'Unlisted'

    // SORT CONFIG
    const SORTING_KEY = (one, other) => {
        return one.name.localeCompare(other.name, undefined, { numeric: true, sensitivity: 'base' });
    };

    // -----------------------------------------------------------------
    // COMMON & UTILS
    // -----------------------------------------------------------------
    const TIMEOUT_STEP_MS = 100;
    const DEFAULT_ELEMENT_TIMEOUT_MS = 15000;

    function debugLog(...args) {
        if (!DEBUG_MODE) return;
        console.log(`[YT-Bot]`, ...args);
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Recursively searches for an element, piercing through Shadow DOMs.
     */
    function querySelectorDeep(selector, root = document) {
        if (!root) return null;

        // 1. Try finding it directly
        const found = root.querySelector(selector);
        if (found) return found;

        // 2. Iterate children with shadowRoot
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.shadowRoot) {
                const deepFound = querySelectorDeep(selector, node.shadowRoot);
                if (deepFound) return deepFound;
            }
        }
        return null;
    }

    async function waitForElement(selector, baseEl, timeoutMs) {
        if (timeoutMs === undefined) timeoutMs = DEFAULT_ELEMENT_TIMEOUT_MS;
        const root = baseEl || document;

        debugLog(`Waiting for: ${selector}`);

        let timeout = timeoutMs;
        while (timeout > 0) {
            const element = querySelectorDeep(selector, root);
            // Check if element exists and is roughly visible
            if (element && (element.offsetParent !== null || getComputedStyle(element).display !== 'none')) {
                return element;
            }
            await sleep(TIMEOUT_STEP_MS);
            timeout -= TIMEOUT_STEP_MS;
        }
        debugLog(`TIMED OUT: Could not find ${selector}`);
        return null;
    }

    function click(element) {
        if (!element) return;
        const eventOpts = { bubbles: true, cancelable: true, view: window };
        element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
        element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        element.dispatchEvent(new MouseEvent('click', eventOpts));
        if (element.click) element.click();
    }

    // -----------------------------------------------------------------
    // PUBLISH DRAFTS LOGIC
    // -----------------------------------------------------------------
    const VISIBILITY_PUBLISH_ORDER = {
        'Private': 'PRIVATE',
        'Unlisted': 'UNLISTED',
        'Public': 'PUBLIC',
    };

    class DraftManager {
        async run() {
            const rows = document.querySelectorAll('ytcp-video-row');
            debugLog(`Found ${rows.length} video rows. Scanning...`);
            
            const draftButtons = [];
            for (const row of rows) {
                const editButton = querySelectorDeep('.edit-draft-button', row);
                if (editButton) draftButtons.push(editButton);
            }

            debugLog(`Found ${draftButtons.length} editable drafts.`);
            if (draftButtons.length === 0) return;

            for (const btn of draftButtons) {
                await this.processVideo(btn);
            }
            debugLog('All drafts processed!');
        }

        async processVideo(editBtn) {
            debugLog('------------------------------------------------');
            debugLog('Processing new video...');
            
            // Scroll to button to ensure visibility
            editBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);
            
            click(editBtn);

            // Wait for Modal
            const dialog = await waitForElement('ytcp-uploads-dialog');
            if (!dialog) return;
            await sleep(1500); 

            // 1. SET "MADE FOR KIDS"
            const kidsGroup = await waitForElement('#audience tp-yt-paper-radio-group', dialog);
            if (kidsGroup) {
                const radioIndex = MADE_FOR_KIDS ? 0 : 1; 
                const radios = kidsGroup.querySelectorAll('tp-yt-paper-radio-button');
                if (radios[radioIndex]) {
                    if (radios[radioIndex].getAttribute('aria-checked') !== 'true') {
                         click(radios[radioIndex]);
                         debugLog(`Set Kids to: ${MADE_FOR_KIDS}`);
                    }
                    await sleep(500);
                }
            }

            // 2. GO TO VISIBILITY
            const visibilityStep = await waitForElement('#step-title-3', dialog);
            if (visibilityStep) {
                click(visibilityStep);
                await sleep(1000);
            } else {
                // Fallback: Click Next button twice
                const nextBtn = await waitForElement('#next-button', dialog);
                click(nextBtn); await sleep(800);
                click(nextBtn); await sleep(800);
            }

            // 3. SET VISIBILITY RADIO
            const visName = VISIBILITY_PUBLISH_ORDER[VISIBILITY];
            const visBtn = await waitForElement(`tp-yt-paper-radio-button[name="${visName}"]`, dialog);
            if (visBtn) {
                click(visBtn);
                debugLog(`Set Visibility to: ${VISIBILITY}`);
                await sleep(500);
            }

            // 4. SAVE
            const doneBtn = await waitForElement('#done-button', dialog);
            if (doneBtn) {
                click(doneBtn);
                debugLog('Clicked Done. Waiting for "Video published" window...');
                
                // Wait specifically for the success dialog (Video published)
                // This usually appears after the spinner finishes
                await this.handleSuccessDialog();
            }
            
            await sleep(1500); // Cooldown
        }

        async handleSuccessDialog() {
            // We loop for a while looking for the close button because 
            // the "Saving..." spinner can take variable time.
            let attempts = 0;
            const maxAttempts = 30; // 30 * 500ms = 15 seconds max wait

            while (attempts < maxAttempts) {
                await sleep(500);
                attempts++;

                // 1. Look for the "Video published" dialog
                // It is usually a ytcp-video-share-dialog
                const shareDialog = querySelectorDeep('ytcp-video-share-dialog');
                
                // 2. Look for close buttons inside it
                // Candidates: #close-button, aria-label="Close", or the X icon
                const closeBtn = querySelectorDeep('#close-button[label="Close"]') || 
                                 querySelectorDeep('ytcp-button#close-button') ||
                                 querySelectorDeep('#close-icon-button');

                // If we found a close button and it's visible
                if (closeBtn && closeBtn.offsetParent) {
                    debugLog('Found "Video published" close button. Clicking...');
                    click(closeBtn);
                    
                    // Verify it closed
                    await sleep(1000);
                    if (!closeBtn.offsetParent) {
                        debugLog('Dialog closed successfully.');
                        return;
                    } else {
                        debugLog('Click registered but dialog still open. Retrying...');
                    }
                }
                
                // Fallback: If we can't find the button but see the dialog, try ESC
                if (shareDialog && shareDialog.offsetParent) {
                    debugLog('Dialog visible but button hidden. Sending ESC.');
                    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
                    document.dispatchEvent(esc);
                }
                
                // Logic break: If we are deep in the loop and no dialog is found at all, 
                // it might mean the save finished instantly and no dialog appeared (rare but possible)
                // or we are still waiting for "Saving..." text to finish.
                // We keep looping just to be safe.
            }
            debugLog('Warning: Timed out waiting for success dialog to close.');
        }
    }

    // -----------------------------------------------------------------
    // SORT PLAYLIST LOGIC (Unchanged)
    // -----------------------------------------------------------------
    async function sortPlaylist() {
        debugLog('Starting Sort Playlist...');
        const items = Array.from(document.querySelectorAll('ytd-playlist-video-renderer'));
        if (items.length === 0) return;

        const videoData = items.map(el => {
            const titleEl = el.querySelector('#video-title');
            return { el: el, name: titleEl ? titleEl.textContent.trim() : '' };
        });

        videoData.sort(SORTING_KEY);
        debugLog(`Sorting ${videoData.length} videos...`);

        for (const vid of videoData) {
            const menuBtn = querySelectorDeep('button', vid.el); 
            if (!menuBtn) continue;

            click(menuBtn);
            await sleep(500);

            const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
            let moveBottomBtn = null;
            for (const item of menuItems) {
                if (item.textContent.toLowerCase().includes('move to bottom')) {
                    moveBottomBtn = item;
                    break;
                }
            }

            if (moveBottomBtn) {
                click(moveBottomBtn);
                await sleep(2000); 
            } else {
                document.body.click();
                await sleep(200);
            }
        }
    }

    // -----------------------------------------------------------------
    // ENTRY POINT
    // -----------------------------------------------------------------
    if (MODE === 'publish_drafts') {
        new DraftManager().run();
    } else if (MODE === 'sort_playlist') {
        sortPlaylist();
    } else {
        console.error('Unknown Mode');
    }

})();
