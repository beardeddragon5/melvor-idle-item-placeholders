import type { ItemPlaceholderSettings } from './settings.mjs';

export interface ItemPos {
  tab: number;
  tabPosition: number;
  locked: boolean;
  isPlaceholder: boolean;
}

export type ItemPlaceholderCharacterStorage = Record<string, ItemPos>;

export interface ItemPlaceholderAccountStorage {
  countEmpties: number;
  empties: string[];
}

type ItemPlaceholderContext = Context<
  ItemPlaceholderSettings,
  ItemPlaceholderCharacterStorage,
  ItemPlaceholderAccountStorage
>;

export default ItemPlaceholderContext;
