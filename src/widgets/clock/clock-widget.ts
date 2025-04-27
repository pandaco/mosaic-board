import './clock-widget.css'; // Import specific styles
import { ClockWidgetPreferences } from '../../types';

// Use maps to store interval IDs per widget instance
const clockIntervalMap = new Map<string, number>();
const stopwatchIntervalMap = new Map<string, number>();
const stopwatchStartTimeMap = new Map<string, number | null>();
const stopwatchElapsedTimeMap = new Map<string, number>();

/**
 * Initializes the clock widget instance.
 * @param widgetId The unique ID of the widget instance.
 * @param element The widget's content HTMLElement (.grid-stack-item-content).
 * @param prefs The initial preferences for this widget instance.
 */
export function initClockWidget(widgetId: string, element: HTMLElement, prefs: ClockWidgetPreferences): void {
    console.log(`Initializing Clock Widget ${widgetId} with prefs:`, prefs);
    const clockDisplay = element.querySelector<HTMLElement>('.clock-display');
    const stopwatchControls = element.querySelector<HTMLElement>('.stopwatch-controls');

    // Initialize state for this widget instance
    stopwatchElapsedTimeMap.set(widgetId, 0);
    stopwatchStartTimeMap.set(widgetId, null);

    // Start the main clock interval for this widget
    cleanupClockInterval(widgetId); // Clear previous interval if any
    updateClockDisplay(clockDisplay); // Initial update
    const intervalId = setInterval(() => updateClockDisplay(clockDisplay), 1000);
    clockIntervalMap.set(widgetId, intervalId);


    // Show/hide stopwatch based on prefs
    if (stopwatchControls) {
        stopwatchControls.classList.toggle('hidden', !prefs.showStopwatch);
        if (prefs.showStopwatch) {
            setupStopwatch(widgetId, element);
        }
        // No need to explicitly stop if hidden, as it wasn't started
    } else {
        console.warn(`Stopwatch controls not found for clock widget ${widgetId}`);
    }


    // TODO: Implement Alert logic based on prefs
    // const alertsInfo = element.querySelector<HTMLElement>('.alerts-info');
    // if (alertsInfo) { /* Update alerts display */ }
}

/**
 * Updates the clock widget display based on new preferences.
 * @param widgetId The unique ID of the widget instance.
 * @param prefs The updated preferences.
 */
export function updateClockWidgetPreferences(widgetId: string, prefs: ClockWidgetPreferences): void {
    console.log(`Updating Clock Widget ${widgetId} with prefs:`, prefs);
    // Find the specific widget's content element
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        const stopwatchControls = widgetElement.querySelector<HTMLElement>('.stopwatch-controls');
        if (stopwatchControls) {
            const wasVisible = !stopwatchControls.classList.contains('hidden');
            const shouldBeVisible = prefs.showStopwatch;

            stopwatchControls.classList.toggle('hidden', !shouldBeVisible);

            if (shouldBeVisible && !wasVisible) {
                // Setup stopwatch if it's becoming visible
                setupStopwatch(widgetId, widgetElement);
            } else if (!shouldBeVisible && wasVisible) {
                 // Stop and reset stopwatch if it's becoming hidden
                 resetStopwatch(widgetId, widgetElement); // Reset ensures it stops and clears time
            }
        }
         // TODO: Update Alert logic based on prefs
         // const alertsInfo = widgetElement.querySelector<HTMLElement>('.alerts-info');
         // if (alertsInfo) { /* Update alerts display */ }
    } else {
         console.warn(`Could not find content element for clock widget ${widgetId} during preference update.`);
    }
}


/** Cleans up the main clock interval for a specific widget */
function cleanupClockInterval(widgetId: string): void {
     if (clockIntervalMap.has(widgetId)) {
        clearInterval(clockIntervalMap.get(widgetId));
        clockIntervalMap.delete(widgetId);
    }
}

/** Cleans up the stopwatch interval for a specific widget */
function cleanupStopwatchInterval(widgetId: string): void {
     if (stopwatchIntervalMap.has(widgetId)) {
        clearInterval(stopwatchIntervalMap.get(widgetId));
        stopwatchIntervalMap.delete(widgetId);
    }
}

/** Updates the main clock display */
function updateClockDisplay(displayElement: HTMLElement | null): void {
    if (!displayElement) return;
    const now = new Date();
    // Consider locale formatting? Intl.DateTimeFormat
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    displayElement.textContent = `${hours}:${minutes}:${seconds}`;
}

/** Sets up stopwatch buttons and initial display */
function setupStopwatch(widgetId: string, element: HTMLElement): void {
     const clockDisplay = element.querySelector<HTMLElement>('.clock-display'); // Also used for stopwatch time
     const startButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(1)');
     const stopButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(2)');
     const resetButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(3)');

     // Get current elapsed time for this widget, default to 0
     const currentElapsedTime = stopwatchElapsedTimeMap.get(widgetId) || 0;

     // Reset display to 0 or last stopped time
     updateStopwatchDisplay(clockDisplay, currentElapsedTime);

     if (startButton && stopButton && resetButton) {
         // Enable Start, disable Stop initially
         startButton.disabled = false;
         stopButton.disabled = true;
         // Enable Reset only if there's elapsed time
         resetButton.disabled = currentElapsedTime === 0;

         // Remove previous listeners before adding new ones to prevent duplicates
         startButton.onclick = null;
         stopButton.onclick = null;
         resetButton.onclick = null;

         // Add new listeners
         startButton.onclick = () => startStopwatch(widgetId, element);
         stopButton.onclick = () => stopStopwatch(widgetId, element);
         resetButton.onclick = () => resetStopwatch(widgetId, element);
     } else {
          console.warn(`Stopwatch control buttons not found for widget ${widgetId}`);
     }
}


/** Starts the stopwatch */
// Prefixed unused 'widgetId' with underscore
function startStopwatch(widgetId: string, element: HTMLElement): void {
     if (stopwatchIntervalMap.has(widgetId)) return; // Already running

     const startButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(1)');
     const stopButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(2)');
     const resetButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(3)');
     const clockDisplay = element.querySelector<HTMLElement>('.clock-display');

     // Get elapsed time before starting/resuming
     const elapsed = stopwatchElapsedTimeMap.get(widgetId) || 0;
     // Set start time relative to elapsed time
     stopwatchStartTimeMap.set(widgetId, Date.now() - elapsed);

     const intervalId = setInterval(() => {
         const startTime = stopwatchStartTimeMap.get(widgetId);
         if (startTime) {
             const currentElapsed = Date.now() - startTime;
             updateStopwatchDisplay(clockDisplay, currentElapsed);
         }
     }, 50); // Update display frequently (e.g., every 50ms for hundredths)

     stopwatchIntervalMap.set(widgetId, intervalId);

     // Update button states
     if(startButton) startButton.disabled = true;
     if(stopButton) stopButton.disabled = false;
     if(resetButton) resetButton.disabled = true; // Can't reset while running
}

/** Stops the stopwatch */
// Prefixed unused 'widgetId' with underscore
function stopStopwatch(widgetId: string, element: HTMLElement): void {
    if (!stopwatchIntervalMap.has(widgetId)) return; // Not running

    const startButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(1)');
    const stopButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(2)');
    const resetButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(3)');

    // Clear interval
    cleanupStopwatchInterval(widgetId);

    // Store final elapsed time
    const startTime = stopwatchStartTimeMap.get(widgetId);
    if (startTime) {
        const finalElapsedTime = Date.now() - startTime;
        stopwatchElapsedTimeMap.set(widgetId, finalElapsedTime);
        // Optionally update display one last time for precision
        // updateStopwatchDisplay(element.querySelector('.clock-display'), finalElapsedTime);
    }
     stopwatchStartTimeMap.set(widgetId, null); // Clear start time


    // Update button states
    if(startButton) startButton.disabled = false; // Can start again
    if(stopButton) stopButton.disabled = true;
    if(resetButton) resetButton.disabled = false; // Can reset now
}

/** Resets the stopwatch */
function resetStopwatch(widgetId: string, element: HTMLElement): void {
     // Ensure it's stopped first (clears interval, calculates final elapsed time)
     stopStopwatch(widgetId, element);

     // Reset elapsed time and start time
     stopwatchElapsedTimeMap.set(widgetId, 0);
     stopwatchStartTimeMap.set(widgetId, null);

     // Update display to zero
     const clockDisplay = element.querySelector<HTMLElement>('.clock-display');
     updateStopwatchDisplay(clockDisplay, 0);

     // Update button states (Start enabled, Stop disabled, Reset disabled)
     const startButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(1)');
     const stopButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(2)');
     const resetButton = element.querySelector<HTMLButtonElement>('.stopwatch-controls button:nth-child(3)');
     if(startButton) startButton.disabled = false;
     if(stopButton) stopButton.disabled = true;
     if(resetButton) resetButton.disabled = true; // Can't reset again until time > 0
}


/** Updates the stopwatch time display */
function updateStopwatchDisplay(displayElement: HTMLElement | null, milliseconds: number): void {
     if (!displayElement) return;
     const totalSeconds = Math.floor(milliseconds / 1000);
     const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
     const seconds = (totalSeconds % 60).toString().padStart(2, '0');
     // Calculate hundredths of a second
     const hundredths = Math.floor((milliseconds % 1000) / 10).toString().padStart(2, '0');
     displayElement.textContent = `${minutes}:${seconds}.${hundredths}`;
}


/**
 * Cleans up intervals and maps associated with a specific clock widget instance.
 * Should be called when the widget is removed.
 * @param widgetId The ID of the widget instance to clean up.
 */
export function cleanupClockWidget(widgetId: string): void {
    console.log(`Cleaning up Clock Widget ${widgetId}`);
    cleanupClockInterval(widgetId);
    cleanupStopwatchInterval(widgetId);
    // Remove entries from maps
    stopwatchStartTimeMap.delete(widgetId);
    stopwatchElapsedTimeMap.delete(widgetId);
}
