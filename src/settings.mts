import type ItemPlaceholderContext from './context.mjs';
import type * as util from './util.mjs';
import type * as ui from './ui.mjs';

export enum CompletionLogCreation {
  Disabled = 'disabled',
  OnlyFound = 'only-found',
  All = 'all',
}

export interface ItemPlaceholderSettings {
  General: {
    'only-locked': boolean;
    'use-slots': boolean;
    'completion-log-creation': CompletionLogCreation;
    'create-historic': void;
    'release-everything': void;
  };
  Interface: {
    'fixed-bank-width': number;
    'placeholder-style': util.PlaceholderStyles;
    'empty-style': util.PlaceholderStyles;
    'potion-style': util.PlaceholderStyles;
  };
}

export async function setupSettings(ctx: ItemPlaceholderContext) {
  const { PlaceholderStyles, refreshAllPlaceholderStylesWithContext } = await ctx.loadModule<typeof util>('util.mjs');
  const { setFixedBankWidth } = await ctx.loadModule<typeof ui>('ui.mjs');

  const styleOptionDisplayName: Record<util.PlaceholderStyles, string> = {
    [PlaceholderStyles.None]: 'Original Item',
    [PlaceholderStyles.Faded]: 'Faded Item',
    [PlaceholderStyles.FadedImage]: 'Faded Image',
    [PlaceholderStyles.Border]: 'Bordered',
    [PlaceholderStyles.Number]: 'Highlight Zero',
    [PlaceholderStyles.NoNumber]: 'No Number',
    [PlaceholderStyles.NoNumberFaded]: 'No Number & Faded',
    [PlaceholderStyles.NoDisplay]: 'No Display',
  };

  const completionLogCreationOptionDisplayName: Record<CompletionLogCreation, string> = {
    [CompletionLogCreation.Disabled]: 'Disabled',
    [CompletionLogCreation.OnlyFound]: 'Only already found',
    [CompletionLogCreation.All]: 'All',
  };

  const generalSettings = ctx.settings.section('General');
  generalSettings.add({
    type: 'switch',
    name: 'only-locked',
    label: 'Only locked Items',
    hint: 'Only act on locked items. Current placeholders will persist but no new unlocked placeholders will be created',
    default: false,
  });

  generalSettings.add({
    type: 'switch',
    name: 'use-slots',
    label: 'Use slots',
    hint: 'Count placeholders towards bank limit. Empties do not count.',
    default: false,
    onChange() {
      const item = game.bank.itemsByTab[0][0];
      if (item) {
        game.bank.renderQueue.items.add(item.item);
      }
    },
  });

  generalSettings.add({
    type: 'dropdown',
    name: 'completion-log-creation',
    label: 'Create placeholders from the completion log',
    hint: 'Define how and if placeholders can be created from the completion log',
    default: CompletionLogCreation.Disabled,
    color: 'primary',
    options: [CompletionLogCreation.Disabled, CompletionLogCreation.OnlyFound, CompletionLogCreation.All].map(
      (value) => ({ value, display: completionLogCreationOptionDisplayName[value] }),
    ),
  });

  generalSettings.add({
    type: 'button',
    name: 'create-historic',
    color: 'warning',
    label: 'Recreate historic Placeholders',
    hint: 'Creates placeholders for items no longer in the bank, but previously owned',
    display: 'Create historic placeholders',
    async onClick() {
      const result = await SwalLocale.fire({
        title: 'Create historic placeholders?',
        html: `
          <h5 class="font-w400 text-combat-smoke font-size-sm mb-2">
            Are you sure you want to create all historic placeholders in the Bank?  <br/>
            This respects your settings for disabled tabs, locked items (will lock new placeholders) and usage of slots
          </h5>
          <h5 class="font-w600 text-danger font-size-sm mb-1">${getLangString('MENU_TEXT_CANNOT_UNDO')}</h5>
        `,
        icon: 'warning',
        showCancelButton: true,
      });

      if (result.value) {
        const disabledTabs = ctx.characterStorage.getItem('disabled-tabs') ?? [];
        const onlyLocked = ctx.settings.section('General').get('only-locked') ?? false;
        const useSlots = ctx.settings.section('General').get('use-slots') ?? false;

        for (const item of game.items.filter(
          (item) => game.stats.itemFindCount(item) > 0 && !game.bank.items.has(item),
        )) {
          const tab = game.bank.getItemDefaultTab(item);
          if (disabledTabs.includes(tab)) {
            continue;
          } else if (useSlots && game.bank.occupiedSlots >= game.bank.maximumSlots) {
            return;
          }

          if (onlyLocked) {
            game.bank.lockedItems.add(item);
          }

          const placeholder = new BankItem(game.bank, item, 0, tab, game.bank.itemsByTab[tab].length);
          game.bank.items.set(item, placeholder);
          game.bank.itemsByTab[tab].push(placeholder);
          game.bank.renderQueue.items.add(item);
        }
      }
    },
  });

  generalSettings.add({
    type: 'button',
    name: 'release-everything',
    color: 'danger',
    label: 'Remove ALL placeholders and empties',
    hint: 'This will remove all placeholders and empties in the Bank',
    display: 'Remove everything',
    async onClick() {
      const result = await SwalLocale.fire({
        title: 'Remove ALL placeholders and empties?',
        html: `
          <h5 class="font-w400 text-combat-smoke font-size-sm mb-2">
            Are you sure you want to remove all placeholders and empties in the Bank?
          </h5>
          <h5 class="font-w600 text-danger font-size-sm mb-1">${getLangString('MENU_TEXT_CANNOT_UNDO')}</h5>
        `,
        icon: 'warning',
        showCancelButton: true,
      });

      if (result.value) {
        for (const tabContent of game.bank.itemsByTab) {
          const copy = tabContent.map((i) => i);
          for (const bankItem of copy.reverse()) {
            if (bankItem.quantity === 0) {
              game.bank.removeItemQuantity(bankItem.item, -1);
            }
          }
        }
      }
    },
  });

  const uiSettings = ctx.settings.section('Interface');

  const onStyleChange = () => {
    setTimeout(() => {
      refreshAllPlaceholderStylesWithContext(ctx);
    }, 50);
  };

  uiSettings.add({
    type: 'number',
    name: 'fixed-bank-width',
    label: 'Items per bank row',
    hint: 'How many items per bank row. 0 to disable this setting',
    min: 0,
    default: 0,
    onChange(value) {
      setFixedBankWidth(value);
    },
  });

  uiSettings.add({
    type: 'dropdown',
    color: 'primary',
    name: 'placeholder-style',
    label: 'Placeholder Style',
    hint: 'Set how placeholders are displayed',
    default: PlaceholderStyles.Faded,
    options: [
      PlaceholderStyles.None,
      PlaceholderStyles.Faded,
      PlaceholderStyles.FadedImage,
      PlaceholderStyles.Border,
      PlaceholderStyles.Number,
      PlaceholderStyles.NoNumber,
      PlaceholderStyles.NoNumberFaded,
    ].map((value) => ({ value, display: styleOptionDisplayName[value] })),
    onChange: onStyleChange,
  });

  uiSettings.add({
    type: 'dropdown',
    color: 'primary',
    name: 'empty-style',
    label: 'Empty Style',
    hint: 'Set how empties are displayed',
    default: PlaceholderStyles.NoNumberFaded,
    options: [
      PlaceholderStyles.None,
      PlaceholderStyles.Faded,
      PlaceholderStyles.Border,
      PlaceholderStyles.Number,
      PlaceholderStyles.NoNumber,
      PlaceholderStyles.NoNumberFaded,
    ].map((value) => ({ value, display: styleOptionDisplayName[value] })),
    onChange: onStyleChange,
  });

  uiSettings.add({
    type: 'dropdown',
    color: 'primary',
    name: 'potion-style',
    label: 'Potion Style',
    hint: 'Set how potions in potion selection menu are displayed',
    default: PlaceholderStyles.Faded,
    options: [
      PlaceholderStyles.None,
      PlaceholderStyles.Faded,
      PlaceholderStyles.FadedImage,
      PlaceholderStyles.Border,
      PlaceholderStyles.Number,
      PlaceholderStyles.NoNumber,
      PlaceholderStyles.NoNumberFaded,
      PlaceholderStyles.NoDisplay,
    ].map((value) => ({ value, display: styleOptionDisplayName[value] })),
    onChange: onStyleChange,
  });
}
