import type ItemPlaceholderContext from './context.mjs';
import type * as empty from './empty.mjs';
import type * as util from './util.mjs';

export async function setupUI(ctx: ItemPlaceholderContext) {
  const { getNextEmpty } = await ctx.loadModule<typeof empty>('empty.mjs');
  const { isPlaceholder, refreshAllPlaceholderStylesWithContext } = await ctx.loadModule<typeof util>('util.mjs');

  function releaseItem(bankItem?: BankItem) {
    if (isPlaceholder(bankItem)) {
      game.bank.removeItemQuantity(bankItem!.item, -1);
    } else if (bankItem) {
      game.notifications.createErrorNotification('item_placeholder:no_placeholder', 'Selected item is no placeholder');
    }
  }

  function ReleaseItem() {
    return {
      $template: '#release-item',
      visible: false,

      setVisible(visible: boolean) {
        this.visible = visible;
      },

      release() {
        releaseItem(game.bank.selectedBankItem);
      },
    };
  }

  function ReleaseAll() {
    return {
      $template: '#item-placeholder-settings',

      release() {
        const bankItems = game.bank.itemsByTab[game.bank.selectedBankTab];
        if (bankItems) {
          const copy = bankItems.map((i) => i);
          for (const bankItem of copy.reverse()) {
            if (isPlaceholder(bankItem)) {
              releaseItem(bankItem);
            }
          }
        }
      },
    };
  }

  function CreateEmpty() {
    return {
      $template: '#create-empty',

      async createEmpty() {
        const itemID = await getNextEmpty(ctx);
        const item = game.items.getObjectByID(itemID);
        game.bank.addItem(item, 1, false, false, true, false);
        const bankItem = game.bank.items.get(item);
        if (bankItem) {
          bankItem.quantity = 0;
          game.bank.moveItemToNewTab(bankItem.tab, game.bank.selectedBankTab, bankItem.tabPosition);

          const selected = game.bank.selectedBankItem;
          if (selected?.tab === game.bank.selectedBankTab) {
            const updatedBankItem = game.bank.items.get(item);
            if (updatedBankItem) {
              game.bank.moveItemInTab(game.bank.selectedBankTab, updatedBankItem.tabPosition, selected.tabPosition + 1);
            }
          }
        }
        game.bank.renderQueue.items.add(item);
        game.bank.queueQuantityUpdates(item);
      },
    };
  }

  ctx.patch(BankItemIcon, 'setItem').after(function (out, bank, bankItem) {
    this.setAttribute('data-item-quantity', String(bankItem.quantity));
  });

  ctx.patch(BankItemIcon, 'updateQuantity').after(function (out, bankItem) {
    this.setAttribute('data-item-quantity', String(bankItem.quantity));
  });

  const releaseItemUI = ReleaseItem();

  ctx.patch(BankSelectedItemMenu, 'setItem').after(function (out, bankItem) {
    releaseItemUI.setVisible(bankItem?.quantity === 0);
    this.setAttribute('data-item-id', bankItem.item.id);
  });

  ctx.onInterfaceReady(() => {
    const selectedItem = document.querySelector('bank-selected-item-menu .row');
    const bankOptions = document.querySelector('#main-bank-options .p-3');
    const bankSettings = document.querySelector('#bank-settings-tab');

    if (!selectedItem || !bankOptions || !bankSettings) {
      return;
    }
    ui.create(releaseItemUI, selectedItem);
    ui.create(ReleaseAll(), bankSettings);
    ui.create(CreateEmpty(), bankOptions);

    refreshAllPlaceholderStylesWithContext(ctx);
  });

  ctx.patch(PotionSelectMenuItem, 'setPotion').after(function (out, potion, game) {
    const quantity = game.bank.items.get(potion)?.quantity ?? 0;
    this.setAttribute('data-item-quantity', String(quantity));
  });

  ctx.patch(BankTabMenu, 'addItemToEndofTab').replace(function (original, bank, bankItem) {
    if (bank.itemsByTab[bankItem.tab].length === bankItem.tabPosition + 1) {
      original(bank, bankItem);
    } else {
      const itemIcon = new BankItemIcon();
      bankTabMenu.tabs[bankItem.tab].itemContainer.insertBefore(
        itemIcon,
        bankTabMenu.tabs[bankItem.tab].itemContainer.childNodes[bankItem.tabPosition],
      );
      itemIcon.setItem(bank, bankItem);
      this.itemIcons.set(bankItem.item, itemIcon);
    }
  });

  ctx.patch(Minibar, 'createQuickEquipIcon').after(function (out, item) {
    const icon = this.quickEquipIcons.get(item);
    if (icon?.button) {
      const quantity = game.bank.items.get(item)?.quantity ?? 0;
      icon.button.setAttribute('data-item-quantity', String(quantity));
    }
  });
}
