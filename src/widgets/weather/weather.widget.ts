import './weather.widget.css';
import { WeatherWidgetPreferences } from '../../types';

interface MockWeatherData {
    temperature: number;
    description: string;
    iconCode: string;
    locationName: string;
    unit: 'metric' | 'imperial';
}

class WeatherWidget {
    private widgetId: string;
    private element: HTMLElement;
    private prefs: WeatherWidgetPreferences;

    constructor(widgetId: string, element: HTMLElement, initialPrefs: WeatherWidgetPreferences) {
        this.widgetId = widgetId;
        this.element = element;
        this.prefs = initialPrefs;
        this.init();
    }

    private init(): void {
        console.log(`Initializing Weather Widget ${this.widgetId} with prefs (using MOCK data):`, this.prefs);
        this.loadAndDisplayWeather();
    }

    updatePreferences(newPrefs: WeatherWidgetPreferences): void {
        console.log(`Updating Weather Widget ${this.widgetId} with prefs (using MOCK data):`, newPrefs);
        this.prefs = newPrefs;
        this.loadAndDisplayWeather(); // Reload data with new preferences
    }

    private async fetchWeatherData(location: string, unit: 'metric' | 'imperial'): Promise<MockWeatherData> {
        console.log(`Simulating weather fetch for ${location} (${unit})`);
        await new Promise(resolve => setTimeout(resolve, 800));

        if (location.toLowerCase().includes('error') || location.trim() === '') {
            throw new Error("Invalid location or simulated error.");
        }

        let temp: number, desc: string, icon: string;
        const isMetric = unit === 'metric';
        const effectiveLocation = location.toLowerCase();

        if (effectiveLocation.includes('lille')) {
            temp = isMetric ? 15 : 59; desc = "Partly cloudy"; icon = "02d";
        } else if (effectiveLocation.includes('paris')) {
            temp = isMetric ? 18 : 64; desc = "Sunny"; icon = "01d";
        } else if (effectiveLocation.includes('london')) {
            temp = isMetric ? 11 : 52; desc = "Light rain"; icon = "10d";
        } else {
            temp = isMetric ? 12 : 54; desc = "Few clouds"; icon = "02d";
        }

        return { temperature: temp, description: desc, iconCode: icon, locationName: location, unit: unit };
    }

    private updateWeatherUI(data: MockWeatherData): void {
        const displayDiv = this.element.querySelector<HTMLElement>('.weather-display');
        const loadingDiv = this.element.querySelector<HTMLElement>('.loading-state');
        const errorDiv = this.element.querySelector<HTMLElement>('.error-state');
        const tempSpan = this.element.querySelector<HTMLElement>('.temperature');
        const unitSpan = this.element.querySelector<HTMLElement>('.unit');
        const descP = this.element.querySelector<HTMLElement>('.description');
        const locationSpans = this.element.querySelectorAll<HTMLElement>('.location-name');
        const iconElement = this.element.querySelector<HTMLElement>('.weather-icon');

        if (!displayDiv || !loadingDiv || !errorDiv || !tempSpan || !unitSpan || !descP || !locationSpans.length || !iconElement) {
            this.showErrorState("Internal widget UI error.");
            return;
        }

        loadingDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        displayDiv.classList.remove('hidden');

        tempSpan.textContent = data.temperature.toFixed(0);
        unitSpan.textContent = data.unit === 'metric' ? '°C' : '°F';
        descP.textContent = data.description;
        locationSpans.forEach(span => span.textContent = data.locationName);

        const iconUrl = `https://openweathermap.org/img/wn/${data.iconCode}@2x.png`;
        iconElement.className = 'weather-icon';
        iconElement.innerHTML = `<img src="${iconUrl}" alt="${data.description}" width="50" height="50">`;
    }

    private showLoadingState(location: string): void {
        const displayDiv = this.element.querySelector<HTMLElement>('.weather-display');
        const loadingDiv = this.element.querySelector<HTMLElement>('.loading-state');
        const errorDiv = this.element.querySelector<HTMLElement>('.error-state');
        const locationSpan = loadingDiv?.querySelector<HTMLElement>('.location-name');

        if (displayDiv && loadingDiv && errorDiv) {
            displayDiv.classList.add('hidden');
            errorDiv.classList.add('hidden');
            loadingDiv.classList.remove('hidden');
            if (locationSpan) locationSpan.textContent = location || '[Location]';
        }
    }

    private showErrorState(message: string): void {
        const displayDiv = this.element.querySelector<HTMLElement>('.weather-display');
        const loadingDiv = this.element.querySelector<HTMLElement>('.loading-state');
        const errorDiv = this.element.querySelector<HTMLElement>('.error-state');
        const errorMessageP = errorDiv?.querySelector<HTMLElement>('.error-message');

        if (displayDiv && loadingDiv && errorDiv && errorMessageP) {
            displayDiv.classList.add('hidden');
            loadingDiv.classList.add('hidden');
            errorDiv.classList.remove('hidden');
            errorMessageP.textContent = message || "An error occurred.";
        } else {
            console.error("Could not display error state, UI elements missing.");
        }
    }

    private async loadAndDisplayWeather(): Promise<void> {
        const location = this.prefs.location || 'Lille';
        const unit = this.prefs.unit || 'metric';
        this.showLoadingState(location);
        try {
            const weatherData = await this.fetchWeatherData(location, unit);
            this.updateWeatherUI(weatherData);
        } catch (error: any) {
            console.error(`Error simulating weather fetch for ${this.widgetId}:`, error);
            this.showErrorState(error.message || "Could not load simulated weather.");
        }
    }
}

// Exported functions for lifecycle manager
export function initWeatherWidget(id: string, element: HTMLElement, prefs: WeatherWidgetPreferences): void {
    new WeatherWidget(id, element, prefs);
}

export function updateWeatherWidgetPreferences(id: string, prefs: WeatherWidgetPreferences): void {
    // Re-initialize for simplicity, assuming no critical internal state needs preserving between pref updates.
    const widgetContainer = document.getElementById(id);
    const element = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');
    if (element) {
        console.warn(`Re-initializing WeatherWidget ${id} due to preference update.`);
        new WeatherWidget(id, element, prefs);
    }
}
