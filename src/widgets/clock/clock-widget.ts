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

    stopwatchElapsedTimeMap.set(widgetId, 0);
    stopwatchStartTimeMap.set(widgetId, null);

    cleanupClockInterval(widgetId);
    updateClockDisplay(clockDisplay);
    const intervalId = setInterval(() => updateClockDisplay(clockDisplay), 1000);
    clockIntervalMap.set(widgetId, intervalId);

    if (stopwatchControls) {
        stopwatchControls.classList.toggle('hidden', !prefs.showStopwatch);
        if (prefs.showStopwatch) {
            setupStopwatch(widgetId, element);
        }
    } else {
        console.warn(`Stopwatch controls not found for clock widget ${widgetId}`);
    }

    // Update Alerts text if needed based on future prefs
    const alertsInfo = element.querySelector<HTMLElement>('.alerts-info');
    if (alertsInfo) {
        // Example: Update based on prefs.alertsEnabled or similar
        // alertsInfo.textContent = prefs.alertsEnabled ? "Alerts: Active" : "Alerts: None";
        alertsInfo.textContent = "Alerts: None"; // Keep default for now
    }

}

/**
 * Updates the clock widget display based on new preferences.
 */
export function updateClockWidgetPreferences(widgetId: string, prefs: ClockWidgetPreferences): void {
    console.log(`Updating Clock Widget ${widgetId} with prefs:`, prefs);
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        const stopwatchControls = widgetElement.querySelector<HTMLElement>('.stopwatch-controls');
        if (stopwatchControls) {
            const wasVisible = !stopwatchControls.classList.contains('hidden');
            const shouldBeVisible = prefs.showStopwatch;

            stopwatchControls.classList.toggle('hidden', !shouldBeVisible);

            if (shouldBeVisible && !wasVisible) {
                setupStopwatch(widgetId, widgetElement);
            } else if (!shouldBeVisible && wasVisible) {
                 resetStopwatch(widgetId, widgetElement);
            }
        }
         // Update Alerts text if needed
         // const alertsInfo = widgetElement.querySelector<HTMLElement>('.alerts-info');
         // if (alertsInfo) { ... }
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
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    displayElement.textContent = `${hours}:${minutes}:${seconds}`;
}

/** Sets up stopwatch buttons and initial display */
function setupStopwatch(widgetId: string, element: HTMLElement): void {
     const clockDisplay = element.querySelector<HTMLElement>('.clock-display');
     // Use specific classes added in HTML for easier targeting
     const startButton = element.querySelector<HTMLButtonElement>('.start-stopwatch');
     const stopButton = element.querySelector<HTMLButtonElement>('.stop-stopwatch');
     const resetButton = element.querySelector<HTMLButtonElement>('.reset-stopwatch');

     const currentElapsedTime = stopwatchElapsedTimeMap.get(widgetId) || 0;
     updateStopwatchDisplay(clockDisplay, currentElapsedTime);

     if (startButton && stopButton && resetButton) {
         startButton.disabled = false;
         stopButton.disabled = true;
         resetButton.disabled = currentElapsedTime === 0;

         startButton.onclick = null;
         stopButton.onclick = null;
         resetButton.onclick = null;

         startButton.onclick = () => startStopwatch(widgetId, element);
         stopButton.onclick = () => stopStopwatch(widgetId, element);
         resetButton.onclick = () => resetStopwatch(widgetId, element);
     } else {
          console.warn(`Stopwatch control buttons not found for widget ${widgetId}`);
     }
}


/** Starts the stopwatch */
function startStopwatch(widgetId: string, element: HTMLElement): void {
     if (stopwatchIntervalMap.has(widgetId)) return;

     const startButton = element.querySelector<HTMLButtonElement>('.start-stopwatch');
     const stopButton = element.querySelector<HTMLButtonElement>('.stop-stopwatch');
     const resetButton = element.querySelector<HTMLButtonElement>('.reset-stopwatch');
     const clockDisplay = element.querySelector<HTMLElement>('.clock-display');

     const elapsed = stopwatchElapsedTimeMap.get(widgetId) || 0;
     stopwatchStartTimeMap.set(widgetId, Date.now() - elapsed);

     const intervalId = setInterval(() => {
         const startTime = stopwatchStartTimeMap.get(widgetId);
         if (startTime) {
             const currentElapsed = Date.now() - startTime;
             updateStopwatchDisplay(clockDisplay, currentElapsed);
         }
     }, 50);

     stopwatchIntervalMap.set(widgetId, intervalId);

     if(startButton) startButton.disabled = true;
     if(stopButton) stopButton.disabled = false;
     if(resetButton) resetButton.disabled = true;
}

/** Stops the stopwatch */
function stopStopwatch(widgetId: string, element: HTMLElement): void {
    if (!stopwatchIntervalMap.has(widgetId)) return;

    const startButton = element.querySelector<HTMLButtonElement>('.start-stopwatch');
    const stopButton = element.querySelector<HTMLButtonElement>('.stop-stopwatch');
    const resetButton = element.querySelector<HTMLButtonElement>('.reset-stopwatch');

    cleanupStopwatchInterval(widgetId);

    const startTime = stopwatchStartTimeMap.get(widgetId);
    if (startTime) {
        const finalElapsedTime = Date.now() - startTime;
        stopwatchElapsedTimeMap.set(widgetId, finalElapsedTime);
    }
     stopwatchStartTimeMap.set(widgetId, null);

    if(startButton) startButton.disabled = false;
    if(stopButton) stopButton.disabled = true;
    if(resetButton) resetButton.disabled = false;
}

/** Resets the stopwatch */
function resetStopwatch(widgetId: string, element: HTMLElement): void {
     stopStopwatch(widgetId, element); // Ensure it's stopped first

     stopwatchElapsedTimeMap.set(widgetId, 0);
     stopwatchStartTimeMap.set(widgetId, null);

     const clockDisplay = element.querySelector<HTMLElement>('.clock-display');
     updateStopwatchDisplay(clockDisplay, 0);

     const startButton = element.querySelector<HTMLButtonElement>('.start-stopwatch');
     const stopButton = element.querySelector<HTMLButtonElement>('.stop-stopwatch');
     const resetButton = element.querySelector<HTMLButtonElement>('.reset-stopwatch');
     if(startButton) startButton.disabled = false; // Should be enabled after reset
     if(stopButton) stopButton.disabled = true;
     if(resetButton) resetButton.disabled = true;
}


/** Updates the stopwatch time display */
function updateStopwatchDisplay(displayElement: HTMLElement | null, milliseconds: number): void {
     if (!displayElement) return;
     const totalSeconds = Math.floor(milliseconds / 1000);
     const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
     const seconds = (totalSeconds % 60).toString().padStart(2, '0');
     const hundredths = Math.floor((milliseconds % 1000) / 10).toString().padStart(2, '0');
     displayElement.textContent = `${minutes}:${seconds}.${hundredths}`;
}


/**
 * Cleans up intervals and maps associated with a specific clock widget instance.
 */
export function cleanupClockWidget(widgetId: string): void {
    console.log(`Cleaning up Clock Widget ${widgetId}`);
    cleanupClockInterval(widgetId);
    cleanupStopwatchInterval(widgetId);
    stopwatchStartTimeMap.delete(widgetId);
    stopwatchElapsedTimeMap.delete(widgetId);
}
