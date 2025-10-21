import { GridStack, GridStackOptions, GridStackWidget, GridStackElement } from 'gridstack';
import { WidgetLayout, WidgetType } from './types';
import { loadLayout, saveLayout } from './storage.service';
import { GRID_CONFIG, DEFAULT_WIDGET_SIZE, WIDGET_ID_PREFIX } from './constants';

let grid: GridStack | null = null;

interface GridStackWidgetWithElement extends GridStackWidget {
    el?: GridStackElement;
    type?: WidgetType;
}

const gridOptions: GridStackOptions = {
    column: GRID_CONFIG.COLUMNS,
    margin: GRID_CONFIG.MARGIN,
    cellHeight: GRID_CONFIG.CELL_HEIGHT,
    disableResize: false,
    disableDrag: false,
    float: true,
    alwaysShowResizeHandle: false,
    animate: true,
};

export function initGrid(containerSelector: string, onChange: (items: GridStackWidget[]) => void): GridStack {
    grid = GridStack.init(gridOptions, containerSelector);

    grid.on('change', (_event, changedItems) => {
         if (changedItems && Array.isArray(changedItems)) {
            onChange(changedItems as GridStackWidget[]);
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

function findWidgetElement(item: GridStackWidgetWithElement): HTMLElement | undefined {
    if (item.el instanceof HTMLElement) {
        return item.el;
    }

    const node = grid?.engine.nodes.find(gridNode => gridNode.id === item.id);
    if (node?.el instanceof HTMLElement) {
        return node.el;
    }

    return undefined;
}

function extractWidgetType(widgetElement: HTMLElement | undefined, itemId: string | undefined): WidgetType {
    if (widgetElement && widgetElement.dataset.widgetType) {
        return widgetElement.dataset.widgetType as WidgetType;
    }

    console.warn(`Could not determine widget type for item ID: ${itemId}. Layout saving might be incomplete.`);
    return WidgetType.Bookmarks;
}

function convertToWidgetLayout(item: GridStackWidgetWithElement): WidgetLayout {
    const widgetElement = findWidgetElement(item);
    const widgetType = extractWidgetType(widgetElement, item.id);

    return {
        x: item.x ?? 0,
        y: item.y ?? 0,
        w: item.w ?? DEFAULT_WIDGET_SIZE.WIDTH,
        h: item.h ?? DEFAULT_WIDGET_SIZE.HEIGHT,
        id: item.id ?? `error_id_${Date.now()}`,
        type: widgetType
    };
}

function filterValidWidgets(layout: WidgetLayout[]): WidgetLayout[] {
    return layout.filter(item => item.id.startsWith(WIDGET_ID_PREFIX));
}

export function saveGridState(): void {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }

    const savedItems = grid.save(false) as GridStackWidgetWithElement[];
    const layout = savedItems.map(convertToWidgetLayout);
    const validLayout = filterValidWidgets(layout);

    saveLayout(validLayout);
}

function isValidLayoutItem(item: WidgetLayout): boolean {
    return !!(
        item &&
        typeof item.id !== 'undefined' &&
        Object.values(WidgetType).includes(item.type)
    );
}

async function createWidgetWithOptions(
    item: WidgetLayout,
    createWidget: (item: WidgetLayout) => Promise<HTMLElement | null>
): Promise<{ element: HTMLElement; options: GridStackWidget } | null> {
    if (!isValidLayoutItem(item)) {
        console.warn("Skipping invalid or unknown type layout item:", item);
        return null;
    }

    const widgetElement = await createWidget(item);
    if (!widgetElement) {
        console.warn(`Failed to create widget of type ${item.type} with id ${item.id}`);
        return null;
    }

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
}

async function loadWidgetsFromLayout(
    layout: WidgetLayout[],
    createWidget: (item: WidgetLayout) => Promise<HTMLElement | null>
): Promise<void> {
    const widgetPromises = layout.map(item => createWidgetWithOptions(item, createWidget));
    const createdWidgets = (await Promise.all(widgetPromises)).filter(widget => widget !== null);

    createdWidgets.forEach(widgetData => {
        if (widgetData) {
            addWidgetToGrid(widgetData.element, widgetData.options);
        }
    });
}

export async function loadGridState(createWidget: (item: WidgetLayout) => Promise<HTMLElement | null>): Promise<void> {
    if (!grid) {
        console.error("Grid not initialized.");
        return;
    }

    grid.removeAll(false);

    const layout = await loadLayout();
    if (layout && layout.length > 0) {
        await loadWidgetsFromLayout(layout, createWidget);
    }
}

export function getGridInstance(): GridStack | null {
    return grid;
}
