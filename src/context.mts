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

export interface ItemPlaceholderCharacterStorage {
  'disabled-tabs': number[];
}

type ItemPlaceholderContext = Context<
  ItemPlaceholderSettings,
  ItemPlaceholderCharacterStorage,
  ItemPlaceholderAccountStorage
>;

export default ItemPlaceholderContext;
