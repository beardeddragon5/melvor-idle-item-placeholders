import type ItemPlaceholderContext from './context.mjs';
import type * as empty from './empty.mjs';
import type * as util from './util.mjs';
import type * as modSettings from './settings.mjs';

const DEFAULT_ICON_WIDTH_PX = 8 + 64 + 8;

export function calcElementWidth(element: Element | Omit<Element, 'computedStyleMap'> | null): number | undefined {
  if (element && 'computedStyleMap' in element) {
    return (
      (element.computedStyleMap().get('margin-left') as CSSNumericValue).to('px').value +
      (element.computedStyleMap().get('width') as CSSNumericValue).to('px').value +
      (element.computedStyleMap().get('margin-right') as CSSNumericValue).to('px').value
    );
  } else if (element) {
    const iconRect = element.getBoundingClientRect();
    const parentRect = element.parentElement?.getBoundingClientRect();
    if (parentRect) {
      return iconRect.width + (iconRect.x - parentRect.x) * 2;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

export function setFixedBankWidth(items: number) {
  const element = document.getElementById('bank-container');
  const tabPanes = document.querySelectorAll<HTMLElement>('bank-tab-menu .tab-pane');
  const bankIcon = document.querySelector('bank-item-icon');

  const itemWidth = calcElementWidth(bankIcon) ?? DEFAULT_ICON_WIDTH_PX;

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
  const { CompletionLogCreation } = await ctx.loadModule<typeof modSettings>('settings.mjs');

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

      async release() {
        const result = await SwalLocale.fire({
          title: 'Release all placeholders and empties in Tab?',
          html: `
            <h5 class="font-w400 text-combat-smoke font-size-sm mb-2">Are you sure you want to release all placeholders and empties in the Tab?</h5>
            <h5 class="font-w600 text-danger font-size-sm mb-1">${getLangString('MENU_TEXT_CANNOT_UNDO')}</h5>
          `,
          icon: 'warning',
          showCancelButton: true,
        });

        if (result.value) {
          const bankItems = game.bank.itemsByTab[game.bank.selectedBankTab];
          if (bankItems) {
            const copy = bankItems.map((i) => i);
            for (const bankItem of copy.reverse()) {
              if (isPlaceholder(bankItem)) {
                releaseItem(bankItem);
              }
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
        if (!item) {
          return;
        }
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

  ctx.patch(BankItemIconElement, 'setItem').after(function (out, bank, bankItem) {
    this.setAttribute('data-item-quantity', String(bankItem.quantity));
  });

  ctx.patch(BankItemIconElement, 'updateQuantity').after(function (out, bankItem) {
    this.setAttribute('data-item-quantity', String(bankItem.quantity));
  });

  ctx.patch(BankSelectedItemMenuElement, 'setItem').after(function (out, bankItem) {
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

  ctx.patch(PotionSelectMenuItemElement, 'setPotion').after(function (out, potion, game) {
    const quantity = game.bank.items.get(potion)?.quantity ?? 0;
    this.setAttribute('data-item-quantity', String(quantity));
  });

  ctx.patch(BankTabMenuElement, 'addItemToEndofTab').replace(function (original, bank, bankItem) {
    if (bank.itemsByTab[bankItem.tab].length === bankItem.tabPosition + 1) {
      original(bank, bankItem);
    } else {
      const itemIcon = new BankItemIconElement();
      bankTabMenu.tabs[bankItem.tab].itemContainer.insertBefore(
        itemIcon,
        bankTabMenu.tabs[bankItem.tab].itemContainer.childNodes[bankItem.tabPosition],
      );
      itemIcon.setItem(bank, bankItem);
      this.itemIcons.set(bankItem.item, itemIcon);
    }
  });

  ctx.patch(BankTabMenuElement, 'selectTab').after(function () {
    settings.update();
  });

  ctx.patch(Minibar, 'createQuickEquipIcon').after(function (out, item) {
    const icon = this.quickEquipIcons.get(item);
    if (icon?.button) {
      const quantity = game.bank.items.get(item)?.quantity ?? 0;
      icon.button.setAttribute('data-item-quantity', String(quantity));
    }
  });

  ctx.patch(ItemCompletionElement, 'updateItem').after(function (out, item, game) {
    if (item.obtainFromItemLog) {
      return;
    }

    this.itemImage.onclick = () => {
      const completionLogCreation =
        ctx.settings.section('General').get('completion-log-creation') ?? CompletionLogCreation.Disabled;
      const onlyLocked = ctx.settings.section('General').get('only-locked') ?? false;
      const useSlots = ctx.settings.section('General').get('use-slots') ?? false;

      if (completionLogCreation === CompletionLogCreation.Disabled) {
        return;
      }

      const found = game.stats.itemFindCount(item) > 0;

      if (!found && completionLogCreation === CompletionLogCreation.OnlyFound) {
        game.notifications.createErrorNotification(
          `item_placeholder:only_found`,
          'Item not found so no placeholder will be created!',
        );
        return;
      } else if (game.bank.items.has(item)) {
        game.notifications.createErrorNotification(`item_placeholder:only_found`, 'Item already in bank');
        return;
      } else if (useSlots && game.bank.occupiedSlots >= game.bank.maximumSlots) {
        game.notifications.createErrorNotification(`item_placeholder:use_slots`, 'Bank is full');
        return;
      }

      if (onlyLocked) {
        game.bank.lockedItems.add(item);
      }

      const tab = game.bank.defaultItemTabs.get(item) ?? 0;
      const placeholder = new BankItem(game.bank, item, 0, tab, game.bank.itemsByTab[tab].length);
      game.bank.items.set(item, placeholder);
      game.bank.itemsByTab[tab].push(placeholder);
      game.bank.renderQueue.items.add(item);

      game.notifications.createItemNotification(item, 0);
    };
  });
}
