import { GridStack, GridStackOptions, GridStackWidget, GridStackElement } from 'gridstack';
import { WidgetLayout, WidgetType } from './types';
import { loadLayout, saveLayout } from './storage-service';

let grid: GridStack | null = null;

interface GridStackWidgetWithElement extends GridStackWidget {
    el?: GridStackElement;
    type?: WidgetType;
}


const gridOptions: GridStackOptions = {
    column: 12,
    margin: 10,
    cellHeight: 80, // Keep fixed height for now, adjust if needed
    disableResize: false,
    disableDrag: false,
    float: true,
    alwaysShowResizeHandle: false,
    animate: true,
};

/**
 * Initializes the Gridstack instance.
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
        let widgetType: WidgetType | undefined = undefined;
        let widgetElement: HTMLElement | undefined = undefined;

        // Try to get the element directly from the saved item
        if (item.el instanceof HTMLElement) {
            widgetElement = item.el;
        } else {
            // If not available, try finding the node in the engine
            const node = grid?.engine.nodes.find(n => n.id === item.id);
            if (node?.el instanceof HTMLElement) {
                widgetElement = node.el;
            }
        }

        // Get type from dataset if element was found
        if (widgetElement && widgetElement.dataset.widgetType) {
             widgetType = widgetElement.dataset.widgetType as WidgetType;
        } else {
             console.warn(`Could not determine widget type for item ID: ${item.id}. Layout saving might be incomplete.`);
             // Cannot reliably save without type, consider skipping or using a placeholder?
             // For now, default to Bookmarks but log prominently.
             widgetType = WidgetType.Bookmarks; // Fallback, but potentially incorrect
        }


        return {
            x: item.x ?? 0,
            y: item.y ?? 0,
            w: item.w ?? 4,
            h: item.h ?? 3,
            id: item.id ?? `error_id_${Date.now()}`,
            type: widgetType // Use determined or fallback type
        };
    }).filter(item => item.id.startsWith('widget-')); // Filter out potential error IDs

    saveLayout(layout);
}


/**
 * Loads the layout from storage and applies it to the grid.
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
            // Ensure item has a valid type from the enum
            if (!item || typeof item.id === 'undefined' || !Object.values(WidgetType).includes(item.type)) {
                console.warn("Skipping invalid or unknown type layout item:", item);
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
