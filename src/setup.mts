import type ItemPlaceholderContext from './context.mjs';
import type { ItemMetadata } from './context.mjs';
import type * as empty from './empty.mjs';
import type * as settings from './settings.mjs';
import type * as ui from './ui.mjs';
import type * as util from './util.mjs';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  interface Bank {
    _itemPlaceholderRemovalData: Map<string, ItemMetadata>;
  }
}

export async function setup(ctx: ItemPlaceholderContext) {
  const { removeEmpty, setupEmpty } = await ctx.loadModule<typeof empty>('empty.mjs');
  const { setupUI } = await ctx.loadModule<typeof ui>('ui.mjs');
  const { setupSettings } = await ctx.loadModule<typeof settings>('settings.mjs');
  const { isEmpty } = await ctx.loadModule<typeof util>('util.mjs');

  await setupEmpty(ctx);
  await setupSettings(ctx);
  await setupUI(ctx);

  ctx.onCharacterLoaded(() => {
    // NOTE: the character storage should be empty at the start
    const disabledTabs = ctx.characterStorage.getItem('disabled-tabs') ?? [];
    ctx.characterStorage.clear();
    ctx.characterStorage.setItem('disabled-tabs', disabledTabs);

    // NOTE: this is for the rare case that items in a tab get duplicated.
    let foundDuplicate = false;
    const allreadyFound = new Set();
    const newBankTabs = [];
    for (let bankTabIndex = 0; bankTabIndex < game.bank.itemsByTab.length; bankTabIndex++) {
      const newBankTabItems = [];
      for (const bankItem of game.bank.itemsByTab[bankTabIndex]) {
        if (!allreadyFound.has(bankItem.item.id)) {
          newBankTabItems.push(bankItem);
          allreadyFound.add(bankItem.item.id);
        } else {
          foundDuplicate = true;
        }
      }
      newBankTabs[bankTabIndex] = newBankTabItems;
    }

    if (foundDuplicate) {
      game.bank.itemsByTab = newBankTabs;
      for (let bankTabIndex = 0; bankTabIndex < game.bank.itemsByTab.length; bankTabIndex++) {
        game.bank.reassignBankItemPositions(bankTabIndex, 0);
        for (const bankItem of game.bank.itemsByTab[bankTabIndex]) {
          game.bank.renderQueue.items.add(bankItem.item);
        }
      }
    }
  });

  ctx.patch(Bank, 'removeItemQuantity').before(function (item, quantity, removeItemCharges) {
    if (!this._itemPlaceholderRemovalData) {
      this._itemPlaceholderRemovalData = new Map();
    }

    const bankItem = this.items.get(item);
    if (!bankItem) {
      return undefined;
    } else if (bankItem.quantity === 0 && quantity === -1) {
      this._itemPlaceholderRemovalData.set(item.id, {
        tab: bankItem.tab,
        tabPosition: bankItem.tabPosition,
        locked: bankItem.locked,
        isPlaceholder: true,
      });
      return [item, 1, removeItemCharges];
    } else if (bankItem.quantity <= quantity) {
      this._itemPlaceholderRemovalData.set(item.id, {
        tab: bankItem.tab,
        tabPosition: bankItem.tabPosition,
        locked: bankItem.locked,
        isPlaceholder: false,
      });
      return undefined;
    }
  });

  ctx.patch(Bank, 'removeItemQuantity').after(function (output, item) {
    const stored = this._itemPlaceholderRemovalData.get(item.id);
    this._itemPlaceholderRemovalData.delete(item.id);

    const bankItem = this.items.get(item);
    if (bankItem !== undefined) {
      return; // NOTE ignore items that are not removed
    }

    if (isEmpty(item)) {
      removeEmpty(ctx, item);
      return;
    }

    if (!stored) {
      console.warn('[Item Placeholder] unexpected item removeal of item', item.id);
      return;
    } else if (stored.isPlaceholder) {
      // NOTE: release placeholder item
      return;
    }

    const { tab, tabPosition, locked } = stored;
    const onlyLocked = ctx.settings.section('General').get('only-locked');
    if (onlyLocked && !locked) {
      // NOTE: only process locked items
      return;
    }

    const disabledTabs = ctx.characterStorage.getItem('disabled-tabs') ?? [];
    const isDisabledTab = disabledTabs.includes(game.bank.selectedBankTab);
    if (isDisabledTab) {
      return;
    }

    if (typeof tabPosition === 'number' && tabPosition >= 0) {
      const placeholder = new BankItem(this, item, 0, tab, tabPosition);
      this.items.set(item, placeholder);
      this.itemsByTab[tab] = [
        ...this.itemsByTab[tab].slice(0, tabPosition),
        placeholder,
        ...this.itemsByTab[tab].slice(tabPosition),
      ];
      this.reassignBankItemPositions(tab, tabPosition);
      this.renderQueue.items.add(item);
      this.queueQuantityUpdates(item);

      if (this.selectedBankItem?.item?.id === item.id) {
        const selectedItemMenu = document.querySelector<BankSelectedItemMenu>('bank-selected-item-menu');
        if (selectedItemMenu) {
          selectedItemMenu.setItem(placeholder, this);
        }
      }
    }
  });

  ctx.patch(Bank, 'processSelectedTabSale').replace(function () {
    const itemsInTab = (this.itemsByTab[this.selectedBankTab] ?? []).map((i) => i);
    for (const bankItem of itemsInTab.reverse()) {
      if (!bankItem.locked && bankItem.quantity > 0) {
        this.processItemSale(bankItem.item, bankItem.quantity);
      }
    }
  });

  ctx.patch(Bank, 'processSellSelectedItems').replace(function () {
    for (const bankItem of this.selectedItems) {
      if (bankItem.quantity > 0) {
        this.processItemSale(bankItem.item, bankItem.quantity);
      }
    }
  });

  ctx.patch(Bank, 'occupiedSlots').get(function (originalSlotsGetter: () => number) {
    if (ctx.settings.section('General').get('use-slots')) {
      let emptySlots = 0;
      for (const bankItem of this.items.values()) {
        if (isEmpty(bankItem.item)) {
          emptySlots++;
        }
      }
      return originalSlotsGetter() - emptySlots;
    } else {
      let placeholder = 0;
      for (const bankItem of this.items.values()) {
        if (bankItem.quantity === 0) {
          placeholder++;
        }
      }
      return originalSlotsGetter() - placeholder;
    }
  });

  ctx.patch(Bank, 'hasItem').after(function (hasItem: boolean, item: Item) {
    if (hasItem) {
      const bankItem = this.items.get(item);
      if (bankItem && bankItem.quantity === 0) {
        return false;
      }
    }
    return hasItem;
  });

  ctx.patch(Bank, 'addQuantityToExistingItems').replace(function (original, quantity) {
    if (quantity <= 0) return;
    for (const tabContent of this.itemsByTab) {
      for (const bankItem of tabContent) {
        if (bankItem.quantity > 0) {
          this.addItem(bankItem.item, quantity, false, false, false, false);
        }
      }
    }
  });

  ctx.patch(Bank, 'checkForClueChasers').replace(function (original) {
    const count = 6;
    if (this.itemsByTab[0].slice(0, count).every((bankItem) => bankItem.quantity > 0)) {
      original();
    } else {
      // NOTE: placeholder found as one of the first items
    }
  });

  const runIfValidItem = (onPlaceholderFound: (item: Item) => void) =>
    function <P extends unknown[], T extends (item: Item, ...args: P) => void>(
      this: Bank,
      original: T,
      item: Item,
      ...args: P
    ): void {
      if (this.hasItem(item)) {
        original(item, ...args);
      } else if (this.items.has(item)) {
        onPlaceholderFound(item);
      } else {
        // NOTE: The item is likely non existant but we want to preserve the original
        //       error handling
        original(item, ...args);
      }
    };

  const runIfValidItemWithNotification = runIfValidItem(() => {
    game.notifications.createErrorNotification(
      'item_placeholder:is_placeholder',
      'Action cannot be performed on placeholders',
    );
  });

  ctx.patch(Bank, 'onItemDoubleClick').replace(runIfValidItemWithNotification);
  ctx.patch(Bank, 'sellItemOnClick').replace(runIfValidItemWithNotification);
  ctx.patch(Bank, 'buryItemOnClick').replace(runIfValidItemWithNotification);
  ctx.patch(Bank, 'openItemOnClick').replace(runIfValidItemWithNotification);
  ctx.patch(Bank, 'processItemOpen').replace(runIfValidItemWithNotification);
  ctx.patch(Bank, 'claimItemOnClick').replace(runIfValidItemWithNotification);
  ctx.patch(Bank, 'useEightOnClick').replace(runIfValidItemWithNotification);

  ctx.patch(Bank, 'readItemOnClick').replace(
    runIfValidItem((item) => {
      item.showContents?.();
    }),
  );
}
