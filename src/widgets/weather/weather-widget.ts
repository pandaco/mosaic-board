import './weather-widget.css'; // Import specific styles
import { WeatherWidgetPreferences } from '../../types';

// --- Simulation d'API Météo ---
interface MockWeatherData {
    temperature: number;
    description: string;
    iconCode: string; // Code pour mapper vers une icône (ex: '01d' pour soleil)
    locationName: string;
    unit: 'metric' | 'imperial';
}

/** Simule un appel réseau pour récupérer les données météo */
async function fetchWeatherData(location: string, unit: 'metric' | 'imperial'): Promise<MockWeatherData> {
    console.log(`Simulating weather fetch for ${location} (${unit})`);
    // Simule une latence réseau
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simule une réponse - varie en fonction du lieu pour le test
    // Dans une vraie application, ce serait un appel fetch() vers une API
    if (location.toLowerCase().includes('erreur') || location.trim() === '') {
        throw new Error("Lieu invalide ou erreur simulée.");
    }

    let temp: number, desc: string, icon: string;
    const isMetric = unit === 'metric';

    switch (location.toLowerCase()) {
        case 'lille':
            temp = isMetric ? 15 : 59;
            desc = "Partiellement nuageux";
            icon = "02d"; // Code OpenWeatherMap pour 'few clouds day'
            break;
        case 'paris':
            temp = isMetric ? 18 : 64;
            desc = "Ensoleillé";
            icon = "01d"; // Code OpenWeatherMap pour 'clear sky day'
            break;
        default:
            temp = isMetric ? 12 : 54;
            desc = "Averses légères";
            icon = "09d"; // Code OpenWeatherMap pour 'shower rain day'
            break;
    }

    return {
        temperature: temp,
        description: desc,
        iconCode: icon,
        locationName: location, // Retourne le nom demandé
        unit: unit
    };
}
// --- Fin Simulation ---


/**
 * Met à jour l'interface du widget météo avec les données récupérées.
 */
function updateWeatherUI(element: HTMLElement, data: MockWeatherData): void {
    const displayDiv = element.querySelector<HTMLElement>('.weather-display');
    const loadingDiv = element.querySelector<HTMLElement>('.loading-state');
    const errorDiv = element.querySelector<HTMLElement>('.error-state');

    const tempSpan = element.querySelector<HTMLElement>('.temperature');
    const unitSpan = element.querySelector<HTMLElement>('.unit');
    const descP = element.querySelector<HTMLElement>('.description');
    const locationSpans = element.querySelectorAll<HTMLElement>('.location-name'); // Select all spans with this class
    const iconI = element.querySelector<HTMLElement>('.weather-icon');

    if (!displayDiv || !loadingDiv || !errorDiv || !tempSpan || !unitSpan || !descP || !locationSpans.length || !iconI) {
        console.error("Weather widget UI elements not found.");
        if (errorDiv) { // Show error if elements are missing
             showErrorState(element, "Erreur interne de l'interface du widget.");
        }
        return;
    }

    // Cache les états de chargement et d'erreur, affiche les données
    loadingDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    displayDiv.classList.remove('hidden');

    // Met à jour les éléments
    tempSpan.textContent = data.temperature.toFixed(0); // Arrondi à l'entier
    unitSpan.textContent = data.unit === 'metric' ? '°C' : '°F';
    descP.textContent = data.description;
    locationSpans.forEach(span => span.textContent = data.locationName); // Update all location name spans

    // Met à jour l'icône (nécessite une bibliothèque d'icônes comme Weather Icons ou mapping manuel)
    // Ici, on ajoute juste la classe basée sur le code simulé
    // Pour utiliser Weather Icons (https://erikflowers.github.io/weather-icons/),
    // il faudrait inclure leur CSS et mapper les codes OpenWeatherMap
    // Exemple de mapping simple (non exhaustif)
    const iconClassName = mapIconCodeToClassName(data.iconCode);
    iconI.className = `weather-icon wi ${iconClassName}`; // Assurez-vous d'avoir inclus les CSS de Weather Icons
    iconI.setAttribute('aria-label', data.description); // Label pour accessibilité
}

/**
 * Affiche l'état de chargement dans le widget.
 */
function showLoadingState(element: HTMLElement, location: string): void {
    const displayDiv = element.querySelector<HTMLElement>('.weather-display');
    const loadingDiv = element.querySelector<HTMLElement>('.loading-state');
    const errorDiv = element.querySelector<HTMLElement>('.error-state');
    const locationSpan = loadingDiv?.querySelector<HTMLElement>('.location-name'); // Target span inside loading div

    if (displayDiv && loadingDiv && errorDiv) {
        displayDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        if (locationSpan) {
            locationSpan.textContent = location || '[Lieu]';
        }
    }
}

/**
 * Affiche un message d'erreur dans le widget.
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
        errorMessageP.textContent = message || "Une erreur est survenue.";
    }
}


/**
 * Fonction principale pour charger et afficher la météo.
 */
async function loadAndDisplayWeather(widgetId: string, element: HTMLElement, prefs: WeatherWidgetPreferences): Promise<void> {
    const location = prefs.location || 'Lille'; // Utilise Lille comme défaut si non défini
    const unit = prefs.unit || 'metric';

    showLoadingState(element, location);

    try {
        const weatherData = await fetchWeatherData(location, unit);
        updateWeatherUI(element, weatherData);
    } catch (error: any) {
        console.error(`Error fetching weather for ${widgetId}:`, error);
        showErrorState(element, error.message || "Impossible de récupérer les données météo.");
    }
}


/**
 * Initializes the weather widget instance.
 * @param widgetId The unique ID of the widget instance.
 * @param element The widget's content HTMLElement (.grid-stack-item-content).
 * @param prefs The initial preferences for this widget instance.
 */
export function initWeatherWidget(widgetId: string, element: HTMLElement, prefs: WeatherWidgetPreferences): void {
    console.log(`Initializing Weather Widget ${widgetId} with prefs:`, prefs);
    loadAndDisplayWeather(widgetId, element, prefs);
}

/**
 * Updates the weather widget display based on new preferences.
 * @param widgetId The unique ID of the widget instance.
 * @param prefs The updated preferences.
 */
export function updateWeatherWidgetPreferences(widgetId: string, prefs: WeatherWidgetPreferences): void {
    console.log(`Updating Weather Widget ${widgetId} with prefs:`, prefs);
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        loadAndDisplayWeather(widgetId, widgetElement, prefs); // Recharge les données avec les nouvelles préférences
    } else {
         console.warn(`Could not find content element for weather widget ${widgetId} during preference update.`);
    }
}

/**
 * Mappe un code d'icône (type OpenWeatherMap) vers une classe CSS (type Weather Icons).
 * Ceci est un exemple basique, une vraie application nécessiterait un mapping plus complet.
 */
function mapIconCodeToClassName(code: string): string {
    const mapping: { [key: string]: string } = {
        '01d': 'wi-day-sunny',
        '01n': 'wi-night-clear',
        '02d': 'wi-day-cloudy',
        '02n': 'wi-night-alt-cloudy',
        '03d': 'wi-cloud',
        '03n': 'wi-cloud',
        '04d': 'wi-cloudy',
        '04n': 'wi-cloudy',
        '09d': 'wi-showers',
        '09n': 'wi-showers',
        '10d': 'wi-day-rain',
        '10n': 'wi-night-alt-rain',
        '11d': 'wi-thunderstorm',
        '11n': 'wi-thunderstorm',
        '13d': 'wi-snow',
        '13n': 'wi-snow',
        '50d': 'wi-fog',
        '50n': 'wi-fog',
    };
    return mapping[code] || 'wi-na'; // Retourne une classe par défaut si code inconnu
}
