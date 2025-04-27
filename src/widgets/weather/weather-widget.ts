import './weather-widget.css'; // Import specific styles
import { WeatherWidgetPreferences } from '../../types';

/**
 * Initializes the weather widget instance.
 * @param widgetId The unique ID of the widget instance.
 * @param element The widget's content HTMLElement (.grid-stack-item-content).
 * @param prefs The initial preferences for this widget instance.
 */
export function initWeatherWidget(widgetId: string, element: HTMLElement, prefs: WeatherWidgetPreferences): void {
    console.log(`Initializing Weather Widget ${widgetId} with prefs:`, prefs);
    const contentElement = element.querySelector('.widget-content');
    const locationSpan = element.querySelector('.location');
    const unitSpan = element.querySelector('.unit');

    if (contentElement && locationSpan && unitSpan) {
        locationSpan.textContent = prefs.location || '[Lieu]';
        unitSpan.textContent = prefs.unit === 'metric' ? '°C' : '°F';
        // TODO: Implement actual weather fetching logic here
        // contentElement.innerHTML = `<p>Fetching weather for ${prefs.location}...</p>`;
    }
}

/**
 * Updates the weather widget display based on new preferences.
 * @param widgetId The unique ID of the widget instance.
 * @param prefs The updated preferences.
 */
export function updateWeatherWidgetPreferences(widgetId: string, prefs: WeatherWidgetPreferences): void {
    console.log(`Updating Weather Widget ${widgetId} with prefs:`, prefs);
    const widgetElement = document.getElementById(widgetId)?.querySelector('.grid-stack-item-content');
    if (widgetElement) {
        const locationSpan = widgetElement.querySelector('.location');
        const unitSpan = widgetElement.querySelector('.unit');
        if (locationSpan) locationSpan.textContent = prefs.location || '[Lieu]';
        if (unitSpan) unitSpan.textContent = prefs.unit === 'metric' ? '°C' : '°F';

        // TODO: Re-fetch weather data with new preferences
        // const contentElement = widgetElement.querySelector('.widget-content');
        // if (contentElement) {
        //     contentElement.innerHTML = `<p>Fetching weather for ${prefs.location}...</p>`;
        // }
    }
}
