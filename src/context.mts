import type { ItemPlaceholderSettings } from './settings.mjs';

export interface ItemMetadata {
  tab: number;
  tabPosition: number;
  locked: boolean;
  isPlaceholder: boolean;
}

export interface ItemPlaceholderAccountStorage {
  countEmpties: number;
  empties: string[];
}

type ItemPlaceholderContext = Context<ItemPlaceholderSettings, never, ItemPlaceholderAccountStorage>;

export default ItemPlaceholderContext;
