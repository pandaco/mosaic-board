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
    await new Promise(resolve => setTimeout(resolve, 800)); // Réduit la latence simulée

    // Simule une réponse - varie en fonction du lieu pour le test
    if (location.toLowerCase().includes('erreur') || location.trim() === '') {
        throw new Error("Lieu invalide ou erreur simulée.");
    }

    let temp: number, desc: string, icon: string;
    const isMetric = unit === 'metric';
    const effectiveLocation = location.toLowerCase(); // Utilise une version en minuscule pour la comparaison

    // Ajoute plus de variété et une gestion par défaut
    if (effectiveLocation.includes('lille')) {
        temp = isMetric ? 15 : 59;
        desc = "Partiellement nuageux";
        icon = "02d";
    } else if (effectiveLocation.includes('paris')) {
        temp = isMetric ? 18 : 64;
        desc = "Ensoleillé";
        icon = "01d";
    } else if (effectiveLocation.includes('london') || effectiveLocation.includes('londres')) {
        temp = isMetric ? 11 : 52;
        desc = "Pluie légère";
        icon = "10d";
    } else { // Cas par défaut
        temp = isMetric ? 12 : 54;
        desc = "Peu nuageux";
        icon = "02d"; // Utilise une icône par défaut
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
    const locationSpans = element.querySelectorAll<HTMLElement>('.location-name');
    const iconElement = element.querySelector<HTMLElement>('.weather-icon'); // Peut être <i> ou <img>

    if (!displayDiv || !loadingDiv || !errorDiv || !tempSpan || !unitSpan || !descP || !locationSpans.length || !iconElement) {
        console.error("Weather widget UI elements not found.");
        if (errorDiv) {
             showErrorState(element, "Erreur interne de l'interface du widget.");
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

    // --- Affichage de l'icône ---
    // Option 1: Utiliser une bibliothèque d'icônes (ex: Weather Icons) via classe CSS
    // Assurez-vous d'avoir inclus le CSS de la bibliothèque dans new-tab.html
    // et que mapIconCodeToClassName est défini et fonctionnel.
    /*
    const iconClassName = mapIconCodeToClassName(data.iconCode);
    iconElement.className = `weather-icon wi ${iconClassName}`; // Assure que c'est un <i> ou <span>
    iconElement.innerHTML = ''; // Vide le contenu précédent
    iconElement.setAttribute('aria-label', data.description);
    */

    // Option 2: Utiliser les icônes PNG d'OpenWeatherMap (même si l'API n'est pas appelée)
    // Cela nécessite que la CSP autorise openweathermap.org pour img-src
    const iconUrl = `https://openweathermap.org/img/wn/${data.iconCode}@2x.png`;
    iconElement.className = 'weather-icon'; // Assure que c'est un <i> ou <span>
    iconElement.innerHTML = `<img src="${iconUrl}" alt="${data.description}" width="50" height="50">`;

    // Option 3: Utiliser une icône Font Awesome basée sur la description (simpliste)
    /*
    let faIconClass = 'fa-question-circle'; // Icône par défaut
    if (data.description.toLowerCase().includes('soleil') || data.description.toLowerCase().includes('clair')) {
        faIconClass = 'fa-sun';
    } else if (data.description.toLowerCase().includes('nuage')) {
        faIconClass = 'fa-cloud';
    } else if (data.description.toLowerCase().includes('pluie') || data.description.toLowerCase().includes('averse')) {
        faIconClass = 'fa-cloud-showers-heavy';
    } else if (data.description.toLowerCase().includes('neige')) {
        faIconClass = 'fa-snowflake';
    } // etc.
    iconElement.className = `weather-icon fas ${faIconClass}`; // Assure que c'est un <i>
    iconElement.innerHTML = '';
    iconElement.setAttribute('aria-label', data.description);
    */

}

/**
 * Affiche l'état de chargement dans le widget.
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
    } else {
        console.error("Impossible d'afficher l'état d'erreur, éléments UI manquants.");
    }
}


/**
 * Fonction principale pour charger et afficher la météo (version simulée).
 */
async function loadAndDisplayWeather(widgetId: string, element: HTMLElement, prefs: WeatherWidgetPreferences): Promise<void> {
    const location = prefs.location || 'Lille'; // Utilise Lille comme défaut
    const unit = prefs.unit || 'metric';

    showLoadingState(element, location);

    try {
        // Appel de la fonction simulée
        const weatherData = await fetchWeatherData(location, unit);
        updateWeatherUI(element, weatherData);
    } catch (error: any) {
        console.error(`Error simulating weather fetch for ${widgetId}:`, error);
        showErrorState(element, error.message || "Impossible de charger la météo simulée.");
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
        loadAndDisplayWeather(widgetId, widgetElement, prefs); // Recharge les données simulées
    } else {
         console.warn(`Could not find content element for weather widget ${widgetId} during preference update.`);
    }
}

// --- Optionnel: Mapping pour bibliothèque d'icônes ---
/*
function mapIconCodeToClassName(code: string): string {
    const mapping: { [key: string]: string } = {
        '01d': 'wi-day-sunny', '01n': 'wi-night-clear',
        '02d': 'wi-day-cloudy', '02n': 'wi-night-alt-cloudy',
        '03d': 'wi-cloud', '03n': 'wi-cloud',
        '04d': 'wi-cloudy', '04n': 'wi-cloudy',
        '09d': 'wi-showers', '09n': 'wi-showers',
        '10d': 'wi-day-rain', '10n': 'wi-night-alt-rain',
        '11d': 'wi-thunderstorm', '11n': 'wi-thunderstorm',
        '13d': 'wi-snow', '13n': 'wi-snow',
        '50d': 'wi-fog', '50n': 'wi-fog',
    };
    return mapping[code] || 'wi-na'; // Icône "non disponible"
}
*/
