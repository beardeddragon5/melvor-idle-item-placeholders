// eslint-disable-next-line @typescript-eslint/ban-types
interface Type<T> extends Function {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
}

declare class BankItem {
  bank: Bank;
  item: Item;
  quantity: number;
  tab: number;
  tabPosition: number;

  constructor(bank: Bank, item: Item, quantity: number, tab: number, tabPosition: number);

  get isGlowing(): boolean;
  get itemSellValue(): number;
  get locked(): boolean;
  get stackValue(): number;
}

declare class BankItemIcon extends HTMLElement {
  setItem(bank: Bank, bankItem: BankItem): void;
  updateQuantity(bankItem: BankItem, enableAccessibility: boolean): void;
}

declare class Item {
  get id(): string;
  get localID(): string;
  get namespace(): string;
  get isModded(): boolean;

  showContents?(): void;
}

declare class BankRenderQueue {
  items: Set<Item>;
}

declare class Bank {
  items: Map<Item, BankItem>;
  itemsByTab: BankItem[][];
  selectedBankItem: BankItem;
  selectedBankTab: number;
  renderQueue: BankRenderQueue;
  selectedItems: Set<BankItem>;
  occupiedSlots: number;

  reassignBankItemPositions(tabID: number, startingPosition: number): void;
  removeItemQuantity(item: Item, quantity: number, removeItemCharges?: boolean): void;
  moveItemToNewTab(oldTabID: number, newTabID: number, oldTabPosition: number): void;
  moveItemInTab(tabID: number, oldTabPosition: number, newTabPosition: number): void;
  processSellSelectedItems(): void;
  processSelectedTabSale(): void;
  processItemSale(item: Item, quantity: number): void;
  addQuantityToExistingItems(quantity: number): void;

  checkForClueChasers(): void;
  onItemDoubleClick(item: Item): void;
  sellItemOnClick(item: Item, quantity: number): void;
  buryItemOnClick(item: Item, quantity: number): void;
  openItemOnClick(item: Item, quantity: number): void;
  processItemOpen(item: Item, quantity: number): void;
  readItemOnClick(item: Item): void;
  claimItemOnClick(item: Item, quantity: number): void;
  useEightOnClick(eight: Item): void;

  addItem(
    item: Item,
    quantity: number,
    logLost: boolean,
    found: boolean,
    ignoreSpace?: boolean,
    notify?: boolean,
    itemSource?: string,
  ): void;
  hasItem(item: Item): boolean;

  queueQuantityUpdates(item: Item): void;
}

declare class ItemRegistry {
  namespaceMaps: Map<string, Map<string, Item>>;
  registeredObjects: Map<string, Item>;

  getObjectByID(value: string): Item;
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
  min: number; // Minimum value to be entered
  max: number; // Maximum value to be entered
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

declare const game: Game;
declare const ui: GameUI;
