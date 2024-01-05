import type ItemPlaceholderContext from './context.mjs';
import type * as empty from './empty.mjs';
import type * as settings from './settings.mjs';
import type * as ui from './ui.mjs';
import type * as util from './util.mjs';

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
    ctx.characterStorage.clear();

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

  ctx.patch(Bank, 'removeItemQuantity').before((item, quantity, removeItemCharges) => {
    const bankItem = game.bank.items.get(item);
    if (!bankItem) {
      return [item, quantity, removeItemCharges];
    } else if (bankItem.quantity === 0 && quantity === -1) {
      ctx.characterStorage.setItem(item.id, {
        tab: bankItem.tab,
        tabPosition: bankItem.tabPosition,
        locked: bankItem.locked,
        isPlaceholder: true,
      });
      return [item, 1, removeItemCharges];
    } else if (bankItem.quantity <= quantity) {
      ctx.characterStorage.setItem(item.id, {
        tab: bankItem.tab,
        tabPosition: bankItem.tabPosition,
        locked: bankItem.locked,
        isPlaceholder: false,
      });
      return [item, quantity, removeItemCharges];
    }
  });

  ctx.patch(Bank, 'removeItemQuantity').after((output, item) => {
    const bankItem = game.bank.items.get(item);
    if (bankItem !== undefined) {
      return; // NOTE ignore items that are not removed
    }

    if (isEmpty(item)) {
      removeEmpty(ctx, item);
      return;
    }

    const stored = ctx.characterStorage.getItem(item.id);
    ctx.characterStorage.removeItem(item.id);
    if (!stored) {
      console.warn('[Item Placeholder] unexpected item removeal of item', item.id);
      return;
    } else if (stored.isPlaceholder) {
      // NOTE: release placeholder item
      return;
    }

    const { tab, tabPosition, locked } = stored;
    ctx.characterStorage.removeItem(item.id);

    const onlyLocked = ctx.settings.section('General').get('only-locked');
    if (onlyLocked && !locked) {
      // NOTE: only process locked items
      return;
    }

    if (typeof tabPosition === 'number' && tabPosition >= 0) {
      const placeholder = new BankItem(game.bank, item, 0, tab, tabPosition);
      game.bank.items.set(item, placeholder);
      game.bank.itemsByTab[tab] = [
        ...game.bank.itemsByTab[tab].slice(0, tabPosition),
        placeholder,
        ...game.bank.itemsByTab[tab].slice(tabPosition),
      ];
      game.bank.reassignBankItemPositions(tab, tabPosition);
      game.bank.renderQueue.items.add(item);
      game.bank.queueQuantityUpdates(item);
    }
  });

  ctx.patch(Bank, 'processSelectedTabSale').replace(() => {
    const itemsInTab = (game.bank.itemsByTab[game.bank.selectedBankTab] ?? []).map((i) => i);
    for (const bankItem of itemsInTab.reverse()) {
      if (!bankItem.locked && bankItem.quantity > 0) {
        game.bank.processItemSale(bankItem.item, bankItem.quantity);
      }
    }
  });

  ctx.patch(Bank, 'processSellSelectedItems').replace(() => {
    for (const bankItem of game.bank.selectedItems) {
      if (bankItem.quantity > 0) {
        game.bank.processItemSale(bankItem.item, bankItem.quantity);
      }
    }
  });

  ctx.patch(Bank, 'occupiedSlots').get((originalSlotsGetter: () => number) => {
    if (ctx.settings.section('General').get('use-slots')) {
      let emptySlots = 0;
      for (const bankItem of game.bank.items.values()) {
        if (isEmpty(bankItem.item)) {
          emptySlots++;
        }
      }
      return originalSlotsGetter() - emptySlots;
    } else {
      let placeholder = 0;
      for (const bankItem of game.bank.items.values()) {
        if (bankItem.quantity === 0) {
          placeholder++;
        }
      }
      return originalSlotsGetter() - placeholder;
    }
  });

  ctx.patch(Bank, 'hasItem').after((hasItem: boolean, item: Item) => {
    if (hasItem) {
      const bankItem = game.bank.items.get(item);
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
