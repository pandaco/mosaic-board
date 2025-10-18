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
    cellHeight: 90,
    disableResize: false,
    disableDrag: false,
    float: true,
    alwaysShowResizeHandle: false,
    animate: true,
};

export function initGrid(containerSelector: string, onChange: (items: GridStackWidget[]) => void): GridStack {
    grid = GridStack.init(gridOptions, containerSelector);

    grid.on('change', (_event, items) => {
         if (items && Array.isArray(items)) {
            onChange(items as GridStackWidget[]);
         }
    });

    return grid;
}

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

export function removeWidgetFromGrid(element: HTMLElement): void {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    grid.removeWidget(element, true, false);
}

export function saveGridState(): void {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    const savedItems = grid.save(false) as GridStackWidgetWithElement[];

    const layout: WidgetLayout[] = savedItems.map((item: GridStackWidgetWithElement) => {
        let widgetType: WidgetType | undefined = undefined;
        let widgetElement: HTMLElement | undefined = undefined;

        if (item.el instanceof HTMLElement) {
            widgetElement = item.el;
        } else {

            const node = grid?.engine.nodes.find(n => n.id === item.id);
            if (node?.el instanceof HTMLElement) {
                widgetElement = node.el;
            }
        }

        if (widgetElement && widgetElement.dataset.widgetType) {
             widgetType = widgetElement.dataset.widgetType as WidgetType;
        } else {
             console.warn(`Could not determine widget type for item ID: ${item.id}. Layout saving might be incomplete.`);

             widgetType = WidgetType.Bookmarks;
        }

        return {
            x: item.x ?? 0,
            y: item.y ?? 0,
            w: item.w ?? 4,
            h: item.h ?? 3,
            id: item.id ?? `error_id_${Date.now()}`,
            type: widgetType
        };
    }).filter(item => item.id.startsWith('widget-'));

    saveLayout(layout);
}

export async function loadGridState(createWidget: (item: WidgetLayout) => Promise<HTMLElement | null>): Promise<void> {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }
    grid.removeAll(false);

    const layout = await loadLayout();
    if (layout && layout.length > 0) {
        const widgetPromises = layout.map(async (item) => {

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

export function getGridInstance(): GridStack | null {
    return grid;
}
