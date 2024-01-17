import type ItemPlaceholderContext from './context.mjs';
import type * as util from './util.mjs';
import type * as ui from './ui.mjs';

export interface ItemPlaceholderSettings {
  General: {
    'only-locked': boolean;
    'use-slots': boolean;
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

  const optionDisplayName: Record<util.PlaceholderStyles, string> = {
    [PlaceholderStyles.None]: 'Original Item',
    [PlaceholderStyles.Faded]: 'Faded Item',
    [PlaceholderStyles.FadedImage]: 'Faded Image',
    [PlaceholderStyles.Border]: 'Bordered',
    [PlaceholderStyles.Number]: 'Highlight Zero',
    [PlaceholderStyles.NoNumber]: 'No Number',
    [PlaceholderStyles.NoNumberFaded]: 'No Number & Faded',
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
    ].map((value) => ({ value, display: optionDisplayName[value] })),
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
    ].map((value) => ({ value, display: optionDisplayName[value] })),
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
    ].map((value) => ({ value, display: optionDisplayName[value] })),
    onChange: onStyleChange,
  });
}
