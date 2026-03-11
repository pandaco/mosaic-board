import { z } from 'zod';

export const BookmarkWidgetConfigSchema = z.object({
  rootFolderId: z.string().optional(),
  displayMode: z.enum(['grid', 'list']),
  useGoogleFavicons: z.boolean(),
  showItemCount: z.boolean(),
});

export const ContentWidgetSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  title: z.string(),
  type: z.enum(['widget', 'link', 'image']),
  content: z.string().optional(),
});

export const BookmarkWidgetSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  title: z.string(),
  type: z.literal('bookmark'),
  configuration: BookmarkWidgetConfigSchema,
});

export const MosaicWidgetSchema = z.discriminatedUnion('type', [
  ContentWidgetSchema,
  BookmarkWidgetSchema,
]);

export const MosaicLayoutSchema = z.object({
  widgets: z.array(MosaicWidgetSchema),
});

export type BookmarkWidgetConfig = z.infer<typeof BookmarkWidgetConfigSchema>;
export type ContentWidget = z.infer<typeof ContentWidgetSchema>;
export type BookmarkWidget = z.infer<typeof BookmarkWidgetSchema>;
export type MosaicWidget = z.infer<typeof MosaicWidgetSchema>;
export type MosaicLayout = z.infer<typeof MosaicLayoutSchema>;

export interface BookmarkItem {
  id: string;
  title: string;
  url?: string;
  type: 'folder' | 'link';
  icon?: string;
  childrenCount?: number;
}

export interface TilePosition {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MosaicGridOptions {
  columns: number;
  cellHeight: string;
  minRow: number;
  margin: number;
  animate: boolean;
  placeholder?: {
    enabled: boolean;
    className?: string;
  };
}
