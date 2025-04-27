import { GridStack, GridStackOptions, GridStackWidget, GridStackElement } from 'gridstack';
import { WidgetLayout, WidgetType } from './types';
import { loadLayout, saveLayout } from './storage-service';

let grid: GridStack | null = null;

// Define Gridstack widget options extending GridStackWidget
interface GridStackWidgetWithElement extends GridStackWidget {
    el?: GridStackElement;
    type?: WidgetType; // Add type here for easier saving
}


const gridOptions: GridStackOptions = {
    column: 12,
    margin: 10,
    // --- Modification ---
    // Essayez une hauteur fixe ou 'initial' au lieu de 'auto'
    // cellHeight: 'auto', // Original
    cellHeight: 80, // Option 1: Hauteur fixe en pixels (ajustez la valeur)
    // cellHeight: 'initial', // Option 2: Laisse les éléments déterminer leur hauteur initiale
    // --- Fin Modification ---
    disableResize: false, // Resizing should be enabled
    disableDrag: false,
    float: true,
    alwaysShowResizeHandle: false, // Keep this false for final look, but handles might appear due to CSS change
    animate: true,
};

/**
 * Initializes the Gridstack instance.
 * @param containerSelector CSS selector for the grid container element.
 * @param onChange Callback function triggered when the grid changes (drag/resize).
 */
export function initGrid(containerSelector: string, onChange: (items: GridStackWidget[]) => void): GridStack {
    grid = GridStack.init(gridOptions, containerSelector);

    grid.on('change', (_event, items) => {
         if (items && Array.isArray(items)) {
            onChange(items as GridStackWidget[]);
         }
    });

    return grid;
}

/**
 * Adds a new widget element to the grid.
 * @param element The HTML element representing the widget container (grid-stack-item).
 * @param options Optional Gridstack widget options (x, y, w, h, id, etc.).
 */
export function addWidgetToGrid(element: HTMLElement, options?: GridStackWidget): void {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    const widgetOptions: GridStackWidgetWithElement = {
        el: element,
        ...options
    };
    grid.addWidget(widgetOptions);
}

/**
 * Removes a widget element from the grid.
 * @param element The HTML element representing the widget.
 */
export function removeWidgetFromGrid(element: HTMLElement): void {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    grid.removeWidget(element, true, false);
}

/**
 * Saves the current layout of the grid to storage.
 */
export function saveGridState(): void {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    const savedItems = grid.save(false) as GridStackWidgetWithElement[];

    const layout: WidgetLayout[] = savedItems.map((item: GridStackWidgetWithElement) => {
        let widgetType: WidgetType = WidgetType.Bookmarks; // Default fallback
        if (item.el && item.el instanceof HTMLElement && item.el.dataset.widgetType) {
            widgetType = item.el.dataset.widgetType as WidgetType;
        } else {
             console.warn(`Could not determine widget type for item ID: ${item.id}. Defaulting to Bookmarks.`);
             const node = grid?.engine.nodes.find(n => n.id === item.id);
             if (node?.el instanceof HTMLElement && node.el.dataset.widgetType) {
                 widgetType = node.el.dataset.widgetType as WidgetType;
                 console.log(`Recovered type for ${item.id}: ${widgetType}`);
             }
        }

        return {
            x: item.x ?? 0,
            y: item.y ?? 0,
            w: item.w ?? 4,
            h: item.h ?? 3,
            id: item.id ?? `error_id_${Date.now()}`,
            type: widgetType
        };
    });

    saveLayout(layout);
}


/**
 * Loads the layout from storage and applies it to the grid.
 * @param createWidget Async function to create the widget element based on layout data.
 */
export async function loadGridState(createWidget: (item: WidgetLayout) => Promise<HTMLElement | null>): Promise<void> {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    grid.removeAll(false);

    const layout = await loadLayout();
    if (layout && layout.length > 0) {
        const widgetPromises = layout.map(async (item) => {
            if (!item || typeof item.id === 'undefined' || typeof item.type === 'undefined') {
                console.warn("Skipping invalid layout item:", item);
                return null;
            }

            const widgetElement = await createWidget(item);
            if (widgetElement) {
                return {
                    element: widgetElement,
                    options: {
                        x: item.x,
                        y: item.y,
                        w: item.w,
                        h: item.h,
                        id: item.id,
                    }
                };
            } else {
                 console.warn(`Failed to create widget of type ${item.type} with id ${item.id}`);
                 return null;
            }
        });

        const createdWidgets = (await Promise.all(widgetPromises)).filter(w => w !== null);

        createdWidgets.forEach(widgetData => {
             if (widgetData) {
                addWidgetToGrid(widgetData.element, widgetData.options);
             }
        });
    }
}


/**
 * Gets the GridStack instance.
 */
export function getGridInstance(): GridStack | null {
    return grid;
}
