import './weather.widget.css'; // Import specific styles
import { WeatherWidgetPreferences } from '../../types';

// --- Weather Data Simulation ---
interface MockWeatherData {
    temperature: number;
    description: string;
    iconCode: string; // Code to map to an icon (e.g., '01d' for sun)
    locationName: string;
    unit: 'metric' | 'imperial';
}

/** Simulates a network call to fetch weather data */
async function fetchWeatherData(location: string, unit: 'metric' | 'imperial'): Promise<MockWeatherData> {
    console.log(`Simulating weather fetch for ${location} (${unit})`);
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate response - varies based on location for testing
    if (location.toLowerCase().includes('error') || location.trim() === '') {
        // Changed text
        throw new Error("Invalid location or simulated error.");
    }

    let temp: number, desc: string, icon: string;
    const isMetric = unit === 'metric';
    const effectiveLocation = location.toLowerCase();

    if (effectiveLocation.includes('lille')) {
        temp = isMetric ? 15 : 59;
        desc = "Partly cloudy"; // Changed text
        icon = "02d";
    } else if (effectiveLocation.includes('paris')) {
        temp = isMetric ? 18 : 64;
        desc = "Sunny"; // Changed text
        icon = "01d";
    } else if (effectiveLocation.includes('london')) {
        temp = isMetric ? 11 : 52;
        desc = "Light rain"; // Changed text
        icon = "10d";
    } else { // Default case
        temp = isMetric ? 12 : 54;
        desc = "Few clouds"; // Changed text
        icon = "02d";
    }

    return {
        temperature: temp,
        description: desc,
        iconCode: icon,
        locationName: location, // Return the requested name
        unit: unit
    };
}
// --- End Simulation ---


/**
 * Updates the weather widget UI with fetched data.
 */
function updateWeatherUI(element: HTMLElement, data: MockWeatherData): void {
    const displayDiv = element.querySelector<HTMLElement>('.weather-display');
    const loadingDiv = element.querySelector<HTMLElement>('.loading-state');
    const errorDiv = element.querySelector<HTMLElement>('.error-state');

    const tempSpan = element.querySelector<HTMLElement>('.temperature');
    const unitSpan = element.querySelector<HTMLElement>('.unit');
    const descP = element.querySelector<HTMLElement>('.description');
    const locationSpans = element.querySelectorAll<HTMLElement>('.location-name');
    const iconElement = element.querySelector<HTMLElement>('.weather-icon');

    if (!displayDiv || !loadingDiv || !errorDiv || !tempSpan || !unitSpan || !descP || !locationSpans.length || !iconElement) {
        console.error("Weather widget UI elements not found.");
        if (errorDiv) {
             // Changed text
             showErrorState(element, "Internal widget UI error.");
        }
        return;
    }

    loadingDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    displayDiv.classList.remove('hidden');

    tempSpan.textContent = data.temperature.toFixed(0);
    unitSpan.textContent = data.unit === 'metric' ? '°C' : '°F';
    descP.textContent = data.description;
    locationSpans.forEach(span => span.textContent = data.locationName);

    // Display icon (using PNG option as example)
    const iconUrl = `https://openweathermap.org/img/wn/${data.iconCode}@2x.png`;
    iconElement.className = 'weather-icon';
    iconElement.innerHTML = `<img src="${iconUrl}" alt="${data.description}" width="50" height="50">`;
}

/**
 * Shows the loading state in the widget.
 */
function showLoadingState(element: HTMLElement, location: string): void {
    const displayDiv = element.querySelector<HTMLElement>('.weather-display');
    const loadingDiv = element.querySelector<HTMLElement>('.loading-state');
    const errorDiv = element.querySelector<HTMLElement>('.error-state');
    const locationSpan = loadingDiv?.querySelector<HTMLElement>('.location-name');

    if (displayDiv && loadingDiv && errorDiv) {
        displayDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        if (locationSpan) {
            // Changed fallback text
            locationSpan.textContent = location || '[Location]';
        }
    }
}

/**
 * Shows an error message in the widget.
 */
function showErrorState(element: HTMLElement, message: string): void {
    const displayDiv = element.querySelector<HTMLElement>('.weather-display');
    const loadingDiv = element.querySelector<HTMLElement>('.loading-state');
    const errorDiv = element.querySelector<HTMLElement>('.error-state');
    const errorMessageP = errorDiv?.querySelector<HTMLElement>('.error-message');

    if (displayDiv && loadingDiv && errorDiv && errorMessageP) {
        displayDiv.classList.add('hidden');
        loadingDiv.classList.add('hidden');
        errorDiv.classList.remove('hidden');
        // Changed default text
        errorMessageP.textContent = message || "An error occurred.";
    } else {
        console.error("Could not display error state, UI elements missing.");
    }
}


/**
 * Main function to load and display weather (simulated version).
 */
async function loadAndDisplayWeather(widgetId: string, element: HTMLElement, prefs: WeatherWidgetPreferences): Promise<void> {
    const location = prefs.location || 'Lille'; // Default location if none set
    const unit = prefs.unit || 'metric';

    showLoadingState(element, location);

    try {
        // Call the simulated function
        const weatherData = await fetchWeatherData(location, unit);
        updateWeatherUI(element, weatherData);
    } catch (error: any) {
        console.error(`Error simulating weather fetch for ${widgetId}:`, error);
        // Changed text
        showErrorState(element, error.message || "Could not load simulated weather.");
    }
}


/**
 * Initializes the weather widget instance.
 */
export function initWeatherWidget(widgetId: string, element: HTMLElement, prefs: WeatherWidgetPreferences): void {
    console.log(`Initializing Weather Widget ${widgetId} with prefs (using MOCK data):`, prefs);
    loadAndDisplayWeather(widgetId, element, prefs);
}

/**
 * Updates the weather widget display based on new preferences.
 */
export function updateWeatherWidgetPreferences(widgetId: string, prefs: WeatherWidgetPreferences): void {
    console.log(`Updating Weather Widget ${widgetId} with prefs (using MOCK data):`, prefs);
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        loadAndDisplayWeather(widgetId, widgetElement, prefs); // Reload simulated data
    } else {
         console.warn(`Could not find content element for weather widget ${widgetId} during preference update.`);
    }
}
