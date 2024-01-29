// #region Custom Types

// eslint-disable-next-line @typescript-eslint/ban-types
interface Type<T> extends Function {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
}

// #endregion

// #region namespaceRegistry.js
interface ItemIdQuantity {
  id: string;
  quantity: number;
}

interface ItemQuantity {
  item: Item;
  quantity: number;
}

interface Namespace {
  name: string;
  displayName: string;
  isModded: boolean;
}

type NamespacePredicate<T extends NamespacedObject> = (
  value: T,
  id?: string,
  registeredObjects?: Map<string, T>,
) => boolean;

declare class NamespaceMap {
  static isValidName(name: string): boolean;
  static isValidModdedName(name: string): boolean;

  registeredNamespaces: Map<string, Namespace>;

  constructor();
  hasNamespace(name: string): boolean;
  getNamespace(name: string): Namespace | undefined;
  registerNamespace(name: string, displayName: string, isModded: boolean): Namespace;
  forEach(callbackfn: (namespace: Namespace) => void): void;
}

declare class NamespacedObject {
  static isValidLocalID(localID: string): boolean;

  constructor(_namespace: Namespace, localID: string);
  get namespace(): string;
  get id(): string;
  get localID(): string;
  get isModded(): boolean;
  getMediaURL(media: string): string;
  getPixiAssetURL(media: string): string;
  isAssetURLExternal(path: string): boolean;
}

declare class NamespaceRegistry<T extends NamespacedObject> {
  rootNamespaceMap: NamespaceMap;
  namespaceMaps: Map<string, Map<string, T>>;
  registeredObjects: Map<string, T>;
  dummyObjects: Map<string, T>;
  namespaceChanges: Map<string, Map<string, Namespace>>;

  constructor(rootNamespaceMap: NamespaceMap);
  get size(): number;
  get dummySize(): number;
  get allObjects(): T[];
  get firstObject(): T;

  registerObject(object: T): void;
  registerNamespaceChange(oldNamespace: Namespace, data: { ids: string[]; newNamespace: Namespace }[]): void;
  getObject(namespace: string, id: string): T | undefined;
  getObjectByID(id: string): T | undefined;
  getDummyObject(id: string, DummyObject: typeof NamespacedObject, game: Game): T | undefined;
  forEach(callbackfn: Parameters<Map<string, T>['forEach']>[0]): void;
  forEachDummy(callbackfn: Parameters<Map<string, T>['forEach']>[0]): void;
  find(predicate: NamespacePredicate<T>): T | undefined;
  filter(predicate: NamespacePredicate<T>): T[];
  every(predicate: NamespacePredicate<T>): boolean;
  everyInNamespace(namespace: string, predicate: NamespacePredicate<T>): boolean;
  some(predicate: NamespacePredicate<T>): boolean;
  someInNamespace(namespace: string, predicate: NamespacePredicate<T>): boolean;
  reduce<R>(callbackfn: (agg: R, value: T, id?: string, registeredObjects?: Map<string, T>) => R, initialValue: R): R;
  /**
   * @throws {UnregisteredConstructionError}
   */
  getSetForConstructor(ids: string[], objectBeingConstructed: unknown, unregisteredName: string): Set<T>;
  getQuantity(quantity: ItemIdQuantity): ItemQuantity;
  getQuantities(quantities: ItemIdQuantity[]): ItemQuantity[];
  hasObjectInNamespace(namespace: string): boolean;
}

declare class ItemRegistry extends NamespaceRegistry<Item> {
  public equipment: NamespaceRegistry<EquipmentItem>;
  public weapons: NamespaceRegistry<WeaponItem>;
  public food: NamespaceRegistry<FoodItem>;
  public bones: NamespaceRegistry<BoneItem>;
  public potions: NamespaceRegistry<PotionItem>;
  public readables: NamespaceRegistry<ReadableItem>;
  public openables: NamespaceRegistry<OpenableItem>;
  public tokens: NamespaceRegistry<TokenItem>;
  public composts: NamespaceRegistry<CompostItem>;
}

interface NamespaceOrder {
  ids: string[];
  insertAt: 'Start' | 'End' | 'Before' | 'After';
  beforeID: string;
  afterID: string;
}

declare class NamespacedArray<T extends NamespacedObject> extends Array {
  registery: NamespaceRegistry<T>;

  constructor(registery: NamespaceRegistry<T>, ...items: T[]);

  registerData(insertions: NamespaceOrder[]): void;
}

// #endregion

// #region bank2.js
interface ItemUpgradeData {
  itemCosts: ItemIdQuantity;
  gpCost: number;
  scCost: number;
  rootItemIDs: string[];
  upgradedItemID: string;
  isDowngrade: boolean;
  quantity?: number;
}

declare class ItemUpgrade {
  itemCosts: ItemIdQuantity[];
  gpCost: number;
  scCost: number;
  rootItems: Item[];
  upgradedItem: Item;
  isDowngrade: boolean;
  upgradedQuantity: number;

  constructor(data: ItemUpgradeData, game: Game);
}

declare class BankRenderQueue {
  items: Set<Item>;
  tabIcons: Set<number>;
  bankSearch: boolean;
  bankValue: boolean;
  space: boolean;
}

declare enum BankSelectionMode {
  ItemSelecting = 0,
  ItemMoveing = 1,
  ItemSelling = 2,
}

declare interface BankSearchItem {
  item: Item;
  qty: number;
  name: string;
  category: string;
  description: string;
  type: string;
  tab: number;
  slot: string;
}

declare class Bank {
  static readonly MAXIMUM_TABS: number;

  game: Game;
  baseSlots: number;
  renderQueue: BankRenderQueue;
  lockedItems: Set<Item>;
  lostItems: Map<Item, number>;
  newItemsAdded: boolean;
  items: Map<Item, BankItem>;
  itemsByTab: BankItem[][];
  defaultItemTabs: Map<Item, number>;
  customSortOrder: Item[];
  glowingItems: Set<Item>;
  tabIcons: Map<number, Item>;
  itemSelectionMode: BankSelectionMode;
  selectedItems: Set<BankItem>;
  selectedBankItem: BankItem;
  itemUpgrades: Map<Item, ItemUpgrade[]>;
  selectedBankTab: number;
  nextOpenedItems: Map<Item, BankItem>;
  searchArray: BankSearchItem[];
  currentSearchQuery: string;
  eightDelay: boolean;
  postLoadItems: Map<Item, number>;
  defaultSortOrder: NamespacedArray<Item>;

  constructor(game: Game, initialTabs?: number, baseSlots?: number);
  get slotsSelected(): number;
  get itemCountSelected(): number;
  get selectedItemValue(): number;
  get unlockedItemArray(): Item[];
  get tabCount(): number;

  get maximumSlots(): number;
  get occupiedSlots(): number;

  registerSortOrder(order: NamespaceOrder[]): void;
  encode(writer: unknown): unknown;
  decode(reader: unknown, version: unknown): void;
  convertFromOldFormat(save: unknown, idMap: unknown): void;
  addDummyItemOnLoad(itemID: string, quantity: number): void;
  onLoad(): void;
  renderModifierChange(): void;
  onModifierChange(): void;
  onEquipmentChange(): void;
  isItemInPosition(item: Item, tab: number, tabPosition: number): boolean;
  registerItemUpgrades(data: ItemUpgradeData[]): void;
  isItemSelected(item: Item): boolean;
  hasItem(item: Item): boolean;
  hasUnlockedItem(item: Item): boolean;
  getTabMedia(tabID: number): string;
  render(): void;
  updateSpaceElement(element: HTMLElement): void;
  queueQuantityUpdates(item: Item): void;
  getItemDefaultTab(item: Item): number;
  getItemSalePrice(item: Item, quantity?: number): number;
  getTabValue(tabID: number): number;
  getBankValue(): number;
  getSnapShot(): Map<Item, number>;
  getHistory(): ItemQuantity[];
  addQuantityToExistingItems(quantity: number): void;
  empty(): void;
  addTabs(quantity: number): void;
  moveItemInTab(tabID: number, oldTabPosition: number, newTabPosition: number): void;
  moveItemToNewTab(oldTabID: number, newTabID: number, oldTabPosition: number): void;
  checkForClueChasers(): void;
  addItemByID(
    itemID: string,
    quantity: number,
    logLost: boolean,
    found: boolean,
    ignoreSpace?: boolean,
    notify?: boolean,
    itemSource?: string,
  ): void;
  addItem(
    item: Item,
    quantity: number,
    logLost: boolean,
    found: boolean,
    ignoreSpace?: boolean,
    notify?: boolean,
    itemSource?: string,
  ): void;
  removeItemQuantity(item: Item, quantity: number, removeItemCharges?: boolean): void;
  removeItemQuantityByID(itemID: string, quantity: number, removeItemCharges?: boolean): void;
  getQty(item: Item): number;
  filterItems(predicate: (bankItem: BankItem) => boolean): Item[];
  checkForItems(costs: ItemQuantity[]): boolean;
  consumeItems(costs: ItemQuantity[]): boolean;
  willItemsFit(costs: ItemQuantity[]): boolean;
  moveItemModeOnClick(): void;
  sellItemModeOnClick(): void;
  selectItemOnClick(item: Item): void;
  onItemDoubleClick(item: Item): void;
  toggleItemLock(bankItem: BankItem): void;
  reassignBankItemPositions(tabID: number, startingPosition: number): void;
  toggleItemSelected(bankItem: BankItem): void;
  deselectBankItem(): void;
  toggleItemForSelection(bankItem: BankItem): void;
  toggleItemForMoving(bankItem: BankItem): void;
  toggleItemForSelling(bankItem: BankItem): void;
  setItemSelectionMode(selectionMode: BankSelectionMode): void;
  disableItemSelectionMode(): void;
  moveSelectedItemsToTab(newTabID: number): void;
  sellAllSelectedItems(): void;
  processSellSelectedItems(): void;
  sellUnlockedItemsOnClick(): void;
  processSelectedTabSale(): void;
  setLockOfSelectedTab(locked: boolean): void;
  setLockOfAllItemsOnClick(locked: boolean): void;
  setLockOfAllItems(locked: boolean): void;
  fireBulkItemSaleConfirmation(totalGP: number, count: number, onConfirm: () => void): void;
  sortButtonOnClick(): void;
  storeCustomSortOrder(): void;
  processItemSale(item: Item, quantity: number): void;
  sellItemOnClick(item: Item, quantity: number): void;
  buryItemOnClick(item: Item, quantity: number): void;
  openItemOnClick(item: Item, quantity: number): void;
  processItemOpen(item: Item, quantity: number): void;
  readItemOnClick(item: Item): void;
  claimItemOnClick(item: Item, quantity: number): void;
  getMaxUpgradeQuantity(upgrade: ItemUpgrade): number;
  checkUpgradePotionRequirement(upgrade: ItemUpgrade): boolean;
  fireItemUpgradeModal(upgrade: ItemUpgrade, rootItem: Item): void;
  upgradeItemOnClick(upgrade: ItemUpgrade, upgradeQuantity: number): void;
  useEightOnClick(eight: Item): void;
  findAFriendOnClick(cracker?: unknown): void;
  updateSearchArray(): void;
  onBankSearchChange(query: string): void;
  setSelectedItemAsTabIcon(tabID: number): void;
  changeDefaultSort(sortSetting: number): void;
  updateItemBorders(): void;
  validateItemOrders(): void;
  printItemsNotInDefaultSortOrder(): void;
}

declare class BankItem {
  bank: Bank;
  item: Item;
  quantity: number;
  tab: number;
  tabPosition: number;

  constructor(bank: Bank, item: Item, quantity: number, tab: number, tabPosition: number);

  get itemSellValue(): number;
  get stackValue(): number;
  get locked(): boolean;
  get isGlowing(): boolean;
}
// #endregion

declare class BankItemIcon extends HTMLElement {
  setItem(bank: Bank, bankItem: BankItem): void;
  updateQuantity(bankItem: BankItem, enableAccessibility: boolean): void;
}

declare class BankSelectedItemMenu extends HTMLElement {
  setItem(bankItem: BankItem, bank: Bank): void;
}

declare class PotionSelectMenuItem extends HTMLElement {
  setPotion(potion: Item, game: Game): void;
}

declare class Item extends NamespacedObject {
  get obtainFromItemLog(): boolean;

  showContents?(): void;
}

declare class WeaponItem extends Item {}
declare class EquipmentItem extends Item {}
declare class FoodItem extends Item {}
declare class BoneItem extends Item {}
declare class PotionItem extends Item {}
declare class ReadableItem extends Item {}
declare class OpenableItem extends Item {}
declare class TokenItem extends Item {}
declare class CompostItem extends Item {}

declare class UnregisteredConstructionError extends Error {
  readonly objectBeingConstructed: unknown;
  readonly unregisteredName: string;
  readonly id: string;

  constructor(objectBeingConstructed: unknown, unregisteredName: string, id: string);
}

declare class Notifications {
  createErrorNotification(customID: string, msg: string): void;
}

declare class Game {
  bank: Bank;
  items: ItemRegistry;
  notifications: Notifications;
}

declare class ModStorage<T> {
  setItem<P extends keyof T>(key: P, data: T[P]): void;
  getItem<P extends keyof T>(key: P): T[P] | undefined;
  removeItem(key: keyof T): void;
  clear(): void;
}

declare class GameDataPackageBuilder {
  items: {
    add(value: unknown): void;
    modify(value: unknown): void;
  };
}

declare class BuiltGameDataPackage {
  add(): Promise<void>;
}

declare class GameData {
  buildPackage(builder: (packageBuilder: GameDataPackageBuilder) => void): BuiltGameDataPackage;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare class MethodPatch<C, M extends (...args: any[]) => any> {
  before(hook: (this: C, ...args: Parameters<M>) => Parameters<M> | undefined): void;
  after(hook: (this: C, returnValue: ReturnType<M>, ...args: Parameters<M>) => ReturnType<M>): void;
  replace(replacement: (this: C, replacedMethod: M, ...args: Parameters<M>) => ReturnType<M>): void;
}

declare class PropertyPatch<C> {
  get<T>(getter: (this: C, originalGetter: () => T) => T): void;
}

type SettingConfigs<K extends string, V> =
  | TextConfig<K>
  | NumberConfig<K>
  | SwitchConfig<K>
  | DropdownConfig<K, V>
  | ButtonConfig<K, V>
  | CheckboxGroupConfig<K, V>
  | RadioGroupConfig<K, V>
  | LabelConfig<K>
  | CustomConfig<K, V>;

interface SettingConfig<K extends string, V> {
  type: string; // Type of the setting
  name: K; // Name of the setting
  label: string | HTMLElement; // Display label for the setting
  hint: string | HTMLElement; // Small help text to display alongside the setting
  default?: V; // Default value for the setting
  onChange?: (value: V, previousValue?: V) => void | boolean | string; // See notes
}

interface TextConfig<K extends string> extends SettingConfig<K, string> {
  type: 'text';
  maxLength: number; // Max length attribute for the textbox
}

interface NumberConfig<K extends string> extends SettingConfig<K, number> {
  type: 'number';
  min?: number; // Minimum value to be entered
  max?: number; // Maximum value to be entered
}

interface SwitchConfig<T extends string> extends SettingConfig<T, boolean> {
  type: 'switch';
}

interface DropdownOption<V> {
  value: V; // value that is used by the setting
  display: string | HTMLElement; // display text or element on the option
}

type SettingColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'dark';

interface DropdownConfig<K extends string, V> extends SettingConfig<K, V> {
  type: 'dropdown';
  color: SettingColor; // see Button config
  options: DropdownOption<V>[]; // see note
}

interface ButtonConfig<K extends string, V> extends SettingConfig<K, V> {
  type: 'button';
  display: string | HTMLElement; // displayed text or element inside the button
  color: SettingColor; // see note
  onClick(): void; // triggered on click of the button
}

interface CheckboxOption<V> {
  value: V; // value to be added to array that is set as setting value
  label: string | HTMLElement;
  hint: string | HTMLElement;
}

interface CheckboxGroupConfig<K extends string, V> extends SettingConfig<K, V> {
  type: 'checkbox-group';
  options: CheckboxOption<V>[]; // see note
}

interface RadioGroupConfig<K extends string, V> extends SettingConfig<K, V> {
  type: 'radio-group';
  options: CheckboxOption<V>[]; // see checkbox group's options schema
}

interface LabelConfig<K extends string> extends SettingConfig<K, undefined> {
  type: 'label';
}

interface SettingTypeConfig<K extends string, V> {
  render(name: string, onChange: () => void, config: SettingConfig<K, V>): HTMLElement;
  get(root: HTMLElement): V;
  set(root: HTMLElement, value: V): void;
}

interface CustomConfig<K extends string, V> extends SettingConfig<K, V>, SettingTypeConfig<K, V> {
  type: 'custom';
}

declare class ModSettingsSection<T> {
  add<P extends keyof T>(
    config: SettingConfigs<P extends string ? P : never, T[P]> | SettingConfigs<P extends string ? P : never, T[P]>[],
  ): void;
  get<P extends keyof T>(value: P): T[P] | undefined;
}

declare class ModSettings<T> {
  section<P extends keyof T>(
    name: T[P] extends Record<string, unknown> ? P : never,
  ): T[P] extends Record<string, unknown> ? ModSettingsSection<T[P]> : never;
}

declare class Context<Settings = unknown, CharacterStorage = unknown, AccountStorage = unknown> {
  loadModule<T>(value: string): Promise<T>;

  onInterfaceReady(hook: () => void | Promise<void>): void;
  onCharacterLoaded(hook: () => void | Promise<void>): void;

  patch<T, P extends keyof T>(
    clazz: Type<T>,
    value: P, // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
  ): T[P] extends (...args: any[]) => any ? MethodPatch<T, T[P]> : PropertyPatch<T>;

  characterStorage: ModStorage<CharacterStorage>;
  accountStorage: ModStorage<AccountStorage>;
  gameData: GameData;
  settings: ModSettings<Settings>;
}

declare class GameUI {
  create(vueElement: unknown, element: Element): void;
}

declare class BankTabMenu {
  tabs: {
    itemContainer: HTMLElement;
  }[];
  itemIcons: Map<Item, BankItemIcon>;

  addItemToEndofTab(bank: Bank, bankItem: BankItem): void;
  selectTab(tabID: number, bank: Bank): void;
}

declare class Skill {}

declare class Minibar {
  quickEquipIcons: Map<
    Item,
    {
      button: HTMLElement;
      tooltip: unknown;
      equippedTick: HTMLElement;
    }
  >;

  game: Game;

  constructor(game: Game);

  get quickEquipContainer(): HTMLElement;

  createQuickEquipIcon(item: Item, skill: Skill): void;
}

declare const game: Game;
declare const bankTabMenu: BankTabMenu;
declare const ui: GameUI;
