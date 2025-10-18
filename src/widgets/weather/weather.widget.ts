import './weather.widget.css';
import { WeatherWidgetPreferences } from '../../types';
import {
    WEATHER_CONFIG,
    CssClass,
    USER_MESSAGES,
} from '../../constants';

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
        this.loadAndDisplayWeather();
    }

    private async fetchWeatherData(location: string, unit: 'metric' | 'imperial'): Promise<MockWeatherData> {
        console.log(`Simulating weather fetch for ${location} (${unit})`);
        await new Promise(resolve => setTimeout(resolve, WEATHER_CONFIG.MOCK_FETCH_DELAY_MS));

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
        const displayDiv = this.element.querySelector<HTMLElement>(`.${CssClass.WeatherDisplay}`);
        const loadingDiv = this.element.querySelector<HTMLElement>(`.${CssClass.LoadingState}`);
        const errorDiv = this.element.querySelector<HTMLElement>(`.${CssClass.ErrorState}`);
        const tempSpan = this.element.querySelector<HTMLElement>(`.${CssClass.Temperature}`);
        const unitSpan = this.element.querySelector<HTMLElement>(`.${CssClass.Unit}`);
        const descP = this.element.querySelector<HTMLElement>(`.${CssClass.Description}`);
        const locationSpans = this.element.querySelectorAll<HTMLElement>(`.${CssClass.LocationName}`);
        const iconElement = this.element.querySelector<HTMLElement>(`.${CssClass.WeatherIcon}`);

        if (!displayDiv || !loadingDiv || !errorDiv || !tempSpan || !unitSpan || !descP || !locationSpans.length || !iconElement) {
            this.showErrorState("Internal widget UI error.");
            return;
        }

        loadingDiv.classList.add(CssClass.Hidden);
        errorDiv.classList.add(CssClass.Hidden);
        displayDiv.classList.remove(CssClass.Hidden);

        tempSpan.textContent = data.temperature.toFixed(0);
        unitSpan.textContent = data.unit === 'metric' ? '°C' : '°F';
        descP.textContent = data.description;
        locationSpans.forEach(span => span.textContent = data.locationName);

        const iconUrl = `${WEATHER_CONFIG.ICON_BASE_URL}${data.iconCode}${WEATHER_CONFIG.ICON_SUFFIX}`;
        iconElement.className = CssClass.WeatherIcon;
        iconElement.innerHTML = `<img src="${iconUrl}" alt="${data.description}" width="${WEATHER_CONFIG.ICON_SIZE}" height="${WEATHER_CONFIG.ICON_SIZE}">`;
    }

    private showLoadingState(location: string): void {
        const displayDiv = this.element.querySelector<HTMLElement>(`.${CssClass.WeatherDisplay}`);
        const loadingDiv = this.element.querySelector<HTMLElement>(`.${CssClass.LoadingState}`);
        const errorDiv = this.element.querySelector<HTMLElement>(`.${CssClass.ErrorState}`);
        const locationSpan = loadingDiv?.querySelector<HTMLElement>(`.${CssClass.LocationName}`);

        if (displayDiv && loadingDiv && errorDiv) {
            displayDiv.classList.add(CssClass.Hidden);
            errorDiv.classList.add(CssClass.Hidden);
            loadingDiv.classList.remove(CssClass.Hidden);
            if (locationSpan) locationSpan.textContent = location || '[Location]';
        }
    }

    private showErrorState(message: string): void {
        const displayDiv = this.element.querySelector<HTMLElement>(`.${CssClass.WeatherDisplay}`);
        const loadingDiv = this.element.querySelector<HTMLElement>(`.${CssClass.LoadingState}`);
        const errorDiv = this.element.querySelector<HTMLElement>(`.${CssClass.ErrorState}`);
        const errorMessageP = errorDiv?.querySelector<HTMLElement>(`.${CssClass.ErrorMessage}`);

        if (displayDiv && loadingDiv && errorDiv && errorMessageP) {
            displayDiv.classList.add(CssClass.Hidden);
            loadingDiv.classList.add(CssClass.Hidden);
            errorDiv.classList.remove(CssClass.Hidden);
            errorMessageP.textContent = message || USER_MESSAGES.ERROR_GENERIC;
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

export function initWeatherWidget(id: string, element: HTMLElement, prefs: WeatherWidgetPreferences): void {
    new WeatherWidget(id, element, prefs);
}

export function updateWeatherWidgetPreferences(id: string, prefs: WeatherWidgetPreferences): void {

    const widgetContainer = document.getElementById(id);
    const element = widgetContainer?.querySelector<HTMLElement>(`.${CssClass.GridStackItemContent}`);
    if (element) {
        console.warn(`Re-initializing WeatherWidget ${id} due to preference update.`);
        new WeatherWidget(id, element, prefs);
    }
}
