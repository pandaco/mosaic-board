import { GridStack, GridStackOptions, GridStackWidget, GridStackElement } from 'gridstack';
// Removed unused 'DashboardLayout' import
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
    cellHeight: 'auto',
    disableResize: false,
    disableDrag: false,
    float: true,
    alwaysShowResizeHandle: false,
    animate: true,
};

/**
 * Initializes the Gridstack instance.
 * @param containerSelector CSS selector for the grid container element.
 * @param onChange Callback function triggered when the grid changes (drag/resize).
 */
export function initGrid(containerSelector: string, onChange: (items: GridStackWidget[]) => void): GridStack {
    grid = GridStack.init(gridOptions, containerSelector);

    // Add event listener for changes
    // Prefix 'event' with '_' to indicate it's unused
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
    // Explicitly cast the result of grid.save to the expected array type
    const savedItems = grid.save(false) as GridStackWidgetWithElement[];

    const layout: WidgetLayout[] = savedItems.map((item: GridStackWidgetWithElement) => {
        let widgetType: WidgetType = WidgetType.Bookmarks; // Default fallback
        // Check if el exists and is an HTMLElement before accessing dataset
        if (item.el && item.el instanceof HTMLElement && item.el.dataset.widgetType) {
            widgetType = item.el.dataset.widgetType as WidgetType;
        } else {
             console.warn(`Could not determine widget type for item ID: ${item.id}. Defaulting to Bookmarks.`);
             // Attempt to find the node in the engine to get the element again if needed
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
            id: item.id ?? `error_id_${Date.now()}`, // Ensure id is a string, provide fallback
            type: widgetType
        };
    });

    saveLayout(layout);
}


/**
 * Loads the layout from storage and applies it to the grid.
 * @param createWidget Async function to create the widget element based on layout data.
 */
// Updated signature to accept async createWidget function
export async function loadGridState(createWidget: (item: WidgetLayout) => Promise<HTMLElement | null>): Promise<void> {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    grid.removeAll(false); // Remove existing widgets without triggering events

    const layout = await loadLayout();
    if (layout && layout.length > 0) {
        // Use Promise.all to handle asynchronous widget creation concurrently
        const widgetPromises = layout.map(async (item) => {
            if (!item || typeof item.id === 'undefined' || typeof item.type === 'undefined') {
                console.warn("Skipping invalid layout item:", item);
                return null; // Skip this item
            }

            // Await the result of the async createWidget function
            const widgetElement = await createWidget(item);
            if (widgetElement) {
                // Return an object containing element and layout options for Gridstack
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
                 return null; // Skip this item if creation failed
            }
        });

        // Wait for all widget creation promises to resolve
        const createdWidgets = (await Promise.all(widgetPromises)).filter(w => w !== null);

        // Add valid widgets to the grid
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
