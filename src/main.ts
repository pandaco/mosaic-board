import './main.css'; // Import global styles
import 'gridstack/dist/gridstack.min.css'; // Import Gridstack styles
import { initGrid, saveGridState } from './grid';
import { addWidget, loadWidgets, closeFolderSelectorModal, confirmFolderSelection } from './widget-manager';
import { WidgetType } from './types';

// Définit les clés de stockage utilisées par l'extension
const STORAGE_KEYS = [
    'dashboardLayout',
    'bookmarkWidgetPrefs',
    'weatherWidgetPrefs',
    'clockWidgetPrefs'
    // Ajoutez d'autres clés si de nouveaux types de widgets sont créés
];

/**
 * Exporte les paramètres actuels de l'extension dans un fichier JSON.
 */
async function exportSettings(): Promise<void> {
    try {
        // Récupère toutes les données pertinentes du stockage local
        const settings = await chrome.storage.local.get(STORAGE_KEYS);
        if (chrome.runtime.lastError) {
            console.error("Erreur lors de la récupération des paramètres pour l'export:", chrome.runtime.lastError);
            alert("Erreur lors de la récupération des paramètres pour l'export.");
            return;
        }

        // Crée un objet Blob contenant les données JSON
        const settingsJson = JSON.stringify(settings, null, 4); // Indentation pour lisibilité
        const blob = new Blob([settingsJson], { type: 'application/json' });

        // Crée une URL pour le Blob
        const url = URL.createObjectURL(blob);

        // Crée un lien de téléchargement temporaire
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        a.download = `mosaic_board_settings_${timestamp}.json`; // Nom du fichier

        // Simule un clic sur le lien pour démarrer le téléchargement
        document.body.appendChild(a); // Nécessaire pour Firefox
        a.click();

        // Nettoie l'URL et le lien temporaire
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("Paramètres exportés avec succès.");

    } catch (error) {
        console.error("Erreur lors de l'exportation des paramètres:", error);
        alert("Une erreur est survenue lors de l'exportation des paramètres.");
    }
}

/**
 * Gère la sélection et l'importation d'un fichier de paramètres JSON.
 * @param event - L'événement de changement du champ de fichier.
 */
function handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
        console.log("Aucun fichier sélectionné.");
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const content = e.target?.result;
        if (typeof content !== 'string') {
            alert("Erreur: Impossible de lire le contenu du fichier.");
            return;
        }

        try {
            const importedSettings = JSON.parse(content);

            // --- Validation basique ---
            if (typeof importedSettings !== 'object' || importedSettings === null) {
                throw new Error("Le fichier JSON est invalide ou vide.");
            }
            // Vérifie la présence d'au moins une clé attendue
            const hasKnownKey = STORAGE_KEYS.some(key => key in importedSettings);
            if (!hasKnownKey) {
                console.warn("Le fichier JSON importé ne semble pas contenir de clés de paramètres Mosaic Board valides.", importedSettings);
                // On pourrait être plus strict et rejeter, mais on essaie quand même
                // throw new Error("Le fichier ne contient pas de paramètres Mosaic Board reconnaissables.");
            }
            // --- Fin Validation ---

            // Efface les anciens paramètres (optionnel, mais souvent souhaité pour un import "propre")
            // Attention: ceci est destructif !
            // await chrome.storage.local.clear(); // Décommentez pour effacer avant import

            // Enregistre les nouveaux paramètres (remplace les clés existantes)
            await chrome.storage.local.set(importedSettings);
            if (chrome.runtime.lastError) {
                 console.error("Erreur lors de l'enregistrement des paramètres importés:", chrome.runtime.lastError);
                 throw new Error(`Erreur lors de l'enregistrement des paramètres: ${chrome.runtime.lastError.message}`);
            }


            console.log("Paramètres importés avec succès.", importedSettings);
            alert("Paramètres importés avec succès ! Veuillez recharger la page (Ctrl+R ou Cmd+R) pour appliquer les changements.");
            // Recharger automatiquement ? Moins sûr si l'import échoue à moitié.
            // window.location.reload();

        } catch (error) {
            console.error("Erreur lors de l'importation des paramètres:", error);
            let message = "Erreur lors de l'importation: ";
            if (error instanceof SyntaxError) {
                message += "Le fichier n'est pas un JSON valide.";
            } else if (error instanceof Error) {
                message += error.message;
            } else {
                 message += "Erreur inconnue.";
            }
            alert(message);
        } finally {
            // Réinitialise l'input file pour permettre d'importer le même fichier à nouveau si besoin
            input.value = '';
        }
    };

    reader.onerror = () => {
        alert(`Erreur lors de la lecture du fichier: ${reader.error}`);
         input.value = ''; // Réinitialise
    };

    reader.readAsText(file);
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("Mosaic Board Initializing...");

    // Initialize Gridstack
    initGrid('#grid-container', () => {
        saveGridState(); // Auto-save layout on change
    });

    // Load existing widgets and layout
    loadWidgets();

    // --- Event Listeners ---

    // Add Widget Button
    const addWidgetButton = document.getElementById('add-widget-button');
    const addWidgetModal = document.getElementById('add-widget-modal');
    const closeAddModalButton = addWidgetModal?.querySelector('.modal-close-button');
    const widgetSelectionList = document.getElementById('widget-selection-list');

    addWidgetButton?.addEventListener('click', () => {
        addWidgetModal?.classList.remove('hidden');
    });

    closeAddModalButton?.addEventListener('click', () => {
        addWidgetModal?.classList.add('hidden');
    });

    addWidgetModal?.addEventListener('click', (event) => {
        if (event.target === addWidgetModal) {
            addWidgetModal.classList.add('hidden');
        }
    });

    widgetSelectionList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const listItem = target.closest<HTMLElement>('li[data-widget-type]');
        if (listItem && listItem.dataset.widgetType) {
            const type = listItem.dataset.widgetType as WidgetType;
            addWidget(type);
            addWidgetModal?.classList.add('hidden');
        }
    });


    // Folder Selector Modal Buttons
    const folderSelectorModal = document.getElementById('folder-selector-modal');
    const closeFolderModalButton = folderSelectorModal?.querySelector('.modal-close-button');
    const cancelFolderButton = document.getElementById('cancel-folder-button');
    const confirmFolderButton = document.getElementById('confirm-folder-button');

    closeFolderModalButton?.addEventListener('click', closeFolderSelectorModal);
    cancelFolderButton?.addEventListener('click', closeFolderSelectorModal);
    confirmFolderButton?.addEventListener('click', confirmFolderSelection);

     folderSelectorModal?.addEventListener('click', (event) => {
         if (event.target === folderSelectorModal) {
             closeFolderSelectorModal();
         }
     });

     // --- Ajout: Event Listeners Import/Export ---
     const exportButton = document.getElementById('export-settings-button');
     const importButton = document.getElementById('import-settings-button');
     const importFileInput = document.getElementById('import-file-input');

     exportButton?.addEventListener('click', exportSettings);

     importButton?.addEventListener('click', () => {
         // Ouvre la boîte de dialogue de sélection de fichier en cliquant sur l'input caché
         importFileInput?.click();
     });

     // Écoute les changements sur l'input de fichier (quand un fichier est sélectionné)
     importFileInput?.addEventListener('change', handleImportFile);
     // --- Fin Ajout ---


    console.log("Mosaic Board Initialized.");
});

// Handle potential cleanup on unload
window.addEventListener('unload', () => {
    // Peut-être fermer les menus ou sauvegarder l'état final si nécessaire
});
