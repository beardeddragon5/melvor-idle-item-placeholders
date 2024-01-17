import type ItemPlaceholderContext from './context.mjs';
import type * as empty from './empty.mjs';
import type * as util from './util.mjs';

const DEFAULT_ICON_WIDTH_PX = 8 + 64 + 8;

export function setFixedBankWidth(items: number) {
  const element = document.getElementById('bank-container');
  const tabPanes = document.querySelectorAll<HTMLElement>('bank-tab-menu .tab-pane');

  const bankIcon = document.querySelector('bank-item-icon');
  const itemWidth = bankIcon
    ? (bankIcon.computedStyleMap().get('margin-left') as CSSNumericValue).to('px').value +
      (bankIcon.computedStyleMap().get('width') as CSSNumericValue).to('px').value +
      (bankIcon.computedStyleMap().get('margin-right') as CSSNumericValue).to('px').value
    : DEFAULT_ICON_WIDTH_PX;

  if (!tabPanes || !element) {
    console.error('[Item Placeholder] could not find elements for fixed bank width');
    return;
  }

  if (items === 0) {
    element?.classList.remove('fixed-bank-width');
    tabPanes.forEach((tabPane) => {
      tabPane.style.minWidth = '';
      tabPane.style.maxWidth = '';
    });
  } else {
    element?.classList.add('fixed-bank-width');
    tabPanes.forEach((tabPane) => {
      tabPane.style.minWidth = `${items * itemWidth}px`;
      tabPane.style.maxWidth = `${items * itemWidth}px`;
    });
  }
}

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

  function BankSettings() {
    return {
      $template: '#item-placeholder-settings',
      isTabDisabled: false,

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

      update() {
        const disabledTabs = ctx.characterStorage.getItem('disabled-tabs') ?? [];
        this.isTabDisabled = disabledTabs.includes(game.bank.selectedBankTab);
        console.info(
          '[Item placeholder] current tab = %d, disabled = %s',
          game.bank.selectedBankTab,
          this.isTabDisabled,
        );
      },

      togglePlaceholdersOnTab() {
        const disabledTabs = ctx.characterStorage.getItem('disabled-tabs') ?? [];
        if (!disabledTabs.includes(game.bank.selectedBankTab)) {
          disabledTabs.push(game.bank.selectedBankTab);
          ctx.characterStorage.setItem('disabled-tabs', disabledTabs);
          this.isTabDisabled = true;
        } else {
          ctx.characterStorage.setItem(
            'disabled-tabs',
            disabledTabs.filter((v) => v !== game.bank.selectedBankTab),
          );
          this.isTabDisabled = false;
        }
        console.info(
          '[Item placeholder] current tab = %d, disabled = %s',
          game.bank.selectedBankTab,
          this.isTabDisabled,
        );
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

  const releaseItemUI = ReleaseItem();
  const settings = BankSettings();

  ctx.patch(BankItemIcon, 'setItem').after(function (out, bank, bankItem) {
    this.setAttribute('data-item-quantity', String(bankItem.quantity));
  });

  ctx.patch(BankItemIcon, 'updateQuantity').after(function (out, bankItem) {
    this.setAttribute('data-item-quantity', String(bankItem.quantity));
  });

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
    settings.update();

    ui.create(releaseItemUI, selectedItem);
    ui.create(settings, bankSettings);
    ui.create(CreateEmpty(), bankOptions);

    refreshAllPlaceholderStylesWithContext(ctx);
    setFixedBankWidth(ctx.settings.section('Interface').get('fixed-bank-width') ?? 0);
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

  ctx.patch(BankTabMenu, 'selectTab').after(function () {
    settings.update();
  });

  ctx.patch(Minibar, 'createQuickEquipIcon').after(function (out, item) {
    const icon = this.quickEquipIcons.get(item);
    if (icon?.button) {
      const quantity = game.bank.items.get(item)?.quantity ?? 0;
      icon.button.setAttribute('data-item-quantity', String(quantity));
    }
  });
}
