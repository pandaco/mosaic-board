import './clock.widget.css';
import { ClockWidgetPreferences } from '../../types';

const clockIntervals = new Map<string, number>();
const stopwatchIntervals = new Map<string, number>();
const stopwatchStartTimes = new Map<string, number | null>();
const stopwatchElapsedTimes = new Map<string, number>();

class ClockWidget {
    private widgetId: string;
    private element: HTMLElement;
    private prefs: ClockWidgetPreferences;
    private clockDisplay: HTMLElement | null;
    private stopwatchControls: HTMLElement | null;
    private startButton: HTMLButtonElement | null;
    private stopButton: HTMLButtonElement | null;
    private resetButton: HTMLButtonElement | null;

    constructor(widgetId: string, element: HTMLElement, initialPrefs: ClockWidgetPreferences) {
        this.widgetId = widgetId;
        this.element = element;
        this.prefs = initialPrefs;

        this.clockDisplay = this.element.querySelector<HTMLElement>('.clock-display');
        this.stopwatchControls = this.element.querySelector<HTMLElement>('.stopwatch-controls');
        this.startButton = this.element.querySelector<HTMLButtonElement>('.start-stopwatch');
        this.stopButton = this.element.querySelector<HTMLButtonElement>('.stop-stopwatch');
        this.resetButton = this.element.querySelector<HTMLButtonElement>('.reset-stopwatch');

        if (!stopwatchElapsedTimes.has(this.widgetId)) {
             stopwatchElapsedTimes.set(this.widgetId, 0);
        }
        if (!stopwatchStartTimes.has(this.widgetId)) {
             stopwatchStartTimes.set(this.widgetId, null);
        }

        this.init();
    }

    private init(): void {
        console.log(`Initializing Clock Widget ${this.widgetId} with prefs:`, this.prefs);
        this.startClock();
        this.updateStopwatchVisibility();
        this.updateAlertsInfo();
    }

    updatePreferences(newPrefs: ClockWidgetPreferences): void {
        console.log(`Updating Clock Widget ${this.widgetId} with prefs:`, newPrefs);
        const oldShowStopwatch = this.prefs.showStopwatch;
        this.prefs = newPrefs;
        if (oldShowStopwatch !== newPrefs.showStopwatch) {
            this.updateStopwatchVisibility();
        }

        this.updateAlertsInfo();
    }

    private startClock(): void {
        this.cleanupClockInterval();
        this.updateClockDisplay();
        const intervalId = setInterval(() => this.updateClockDisplay(), 1000);
        clockIntervals.set(this.widgetId, intervalId);
    }

    private updateClockDisplay(): void {
        if (!this.clockDisplay || stopwatchIntervals.has(this.widgetId)) return;
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        this.clockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }

    private cleanupClockInterval(): void {
        if (clockIntervals.has(this.widgetId)) {
            clearInterval(clockIntervals.get(this.widgetId));
            clockIntervals.delete(this.widgetId);
        }
    }

    private updateStopwatchVisibility(): void {
        if (!this.stopwatchControls) return;
        const shouldBeVisible = this.prefs.showStopwatch;
        this.stopwatchControls.classList.toggle('hidden', !shouldBeVisible);
        if (shouldBeVisible) {
            this.setupStopwatch();
        } else {
            this.resetStopwatch();
            this.updateClockDisplay();
        }
    }

    private setupStopwatch(): void {
        const currentElapsedTime = stopwatchElapsedTimes.get(this.widgetId) || 0;
        this.updateStopwatchDisplay(currentElapsedTime);

        if (this.startButton && this.stopButton && this.resetButton) {
            const isRunning = stopwatchIntervals.has(this.widgetId);
            this.startButton.disabled = isRunning;
            this.stopButton.disabled = !isRunning;
            this.resetButton.disabled = isRunning || currentElapsedTime === 0;

            this.startButton.onclick = () => this.startStopwatch();
            this.stopButton.onclick = () => this.stopStopwatch();
            this.resetButton.onclick = () => this.resetStopwatch();
        }
    }

    private startStopwatch(): void {
        if (stopwatchIntervals.has(this.widgetId)) return;

        this.cleanupClockInterval();

        const elapsed = stopwatchElapsedTimes.get(this.widgetId) || 0;
        stopwatchStartTimes.set(this.widgetId, Date.now() - elapsed);

        const intervalId = setInterval(() => {
            const startTime = stopwatchStartTimes.get(this.widgetId);
            if (startTime) {
                const currentElapsed = Date.now() - startTime;
                this.updateStopwatchDisplay(currentElapsed);
            }
        }, 50);
        stopwatchIntervals.set(this.widgetId, intervalId);

        if(this.startButton) this.startButton.disabled = true;
        if(this.stopButton) this.stopButton.disabled = false;
        if(this.resetButton) this.resetButton.disabled = true;
    }

    private stopStopwatch(): void {
        if (!stopwatchIntervals.has(this.widgetId)) return;

        this.cleanupStopwatchInterval();

        const startTime = stopwatchStartTimes.get(this.widgetId);
        if (startTime) {
            const finalElapsedTime = Date.now() - startTime;
            stopwatchElapsedTimes.set(this.widgetId, finalElapsedTime);
            this.updateStopwatchDisplay(finalElapsedTime);
        }
        stopwatchStartTimes.set(this.widgetId, null);

        if(this.startButton) this.startButton.disabled = false;
        if(this.stopButton) this.stopButton.disabled = true;
        if(this.resetButton) this.resetButton.disabled = false;
    }

    private resetStopwatch(): void {
        this.stopStopwatch();
        stopwatchElapsedTimes.set(this.widgetId, 0);
        stopwatchStartTimes.set(this.widgetId, null);
        this.updateStopwatchDisplay(0);

        if(this.startButton) this.startButton.disabled = false;
        if(this.stopButton) this.stopButton.disabled = true;
        if(this.resetButton) this.resetButton.disabled = true;

        if (!this.prefs.showStopwatch || stopwatchElapsedTimes.get(this.widgetId) === 0) {
             this.startClock();
        }
    }

    private updateStopwatchDisplay(milliseconds: number): void {
        if (!this.clockDisplay) return;
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        const hundredths = Math.floor((milliseconds % 1000) / 10).toString().padStart(2, '0');
        this.clockDisplay.textContent = `${minutes}:${seconds}.${hundredths}`;
    }

     private cleanupStopwatchInterval(): void {
        if (stopwatchIntervals.has(this.widgetId)) {
            clearInterval(stopwatchIntervals.get(this.widgetId));
            stopwatchIntervals.delete(this.widgetId);
        }
    }

    private updateAlertsInfo(): void {
        const alertsInfo = this.element.querySelector<HTMLElement>('.alerts-info');
        if (alertsInfo) {

            alertsInfo.textContent = "Alerts: None";
        }
    }

    cleanup(): void {
        console.log(`Cleaning up Clock Widget ${this.widgetId}`);
        this.cleanupClockInterval();
        this.cleanupStopwatchInterval();

    }
}

export function initClockWidget(id: string, element: HTMLElement, prefs: ClockWidgetPreferences): void {
    new ClockWidget(id, element, prefs);
}

export function updateClockWidgetPreferences(id: string, prefs: ClockWidgetPreferences): void {

    const widgetContainer = document.getElementById(id);
    const element = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');
    if (element) {
        console.warn(`Re-initializing ClockWidget ${id} due to preference update.`);
        new ClockWidget(id, element, prefs);
    }
}

export function cleanupClockWidget(widgetId: string): void {

    if (clockIntervals.has(widgetId)) {
        clearInterval(clockIntervals.get(widgetId));
        clockIntervals.delete(widgetId);
    }
    if (stopwatchIntervals.has(widgetId)) {
        clearInterval(stopwatchIntervals.get(widgetId));
        stopwatchIntervals.delete(widgetId);
    }

    console.log(`Cleaned up intervals for Clock Widget ${widgetId}`);
}
