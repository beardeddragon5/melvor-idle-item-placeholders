import type ItemPlaceholderContext from './context.mjs';
import type * as util from './util.mjs';

export interface ItemPlaceholderSettings {
  General: {
    'only-locked': boolean;
    'use-slots': boolean;
  };
  Interface: {
    'placeholder-style': util.PlaceholderStyles;
    'empty-style': util.PlaceholderStyles;
  };
}

export async function setupSettings(ctx: ItemPlaceholderContext) {
  const { PlaceholderStyles, refreshAllPlaceholderStyles } = await ctx.loadModule<typeof util>('util.mjs');

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

  uiSettings.add({
    type: 'dropdown',
    color: 'primary',
    name: 'placeholder-style',
    label: 'Placeholder Style',
    hint: 'Set how placeholders are displayed',
    default: PlaceholderStyles.FadedImage,
    options: [
      {
        value: PlaceholderStyles.None,
        display: 'Original Item',
      },
      {
        value: PlaceholderStyles.Faded,
        display: 'Faded Item',
      },
      {
        value: PlaceholderStyles.FadedImage,
        display: 'Faded Item image',
      },
      {
        value: PlaceholderStyles.Border,
        display: 'Bordered item',
      },
      {
        value: PlaceholderStyles.Number,
        display: 'Emphasized number',
      },
      {
        value: PlaceholderStyles.NoNumber,
        display: 'No number',
      },
      {
        value: PlaceholderStyles.NoNumberFaded,
        display: 'No number faded',
      },
    ],
    onChange(itemStyle) {
      const emptyStyle = ctx.settings.section('Interface').get('empty-style');
      if (itemStyle && emptyStyle) {
        refreshAllPlaceholderStyles(itemStyle, emptyStyle);
      }
    },
  });

  uiSettings.add({
    type: 'dropdown',
    color: 'primary',
    name: 'empty-style',
    label: 'Empty Style',
    hint: 'Set how empties are displayed',
    default: PlaceholderStyles.Faded,
    options: [
      {
        value: PlaceholderStyles.None,
        display: 'Original Item',
      },
      {
        value: PlaceholderStyles.Faded,
        display: 'Faded Item',
      },
      {
        value: PlaceholderStyles.Border,
        display: 'Bordered item',
      },
      {
        value: PlaceholderStyles.Number,
        display: 'Emphasized number',
      },
      {
        value: PlaceholderStyles.NoNumber,
        display: 'No number',
      },
      {
        value: PlaceholderStyles.NoNumberFaded,
        display: 'No number faded',
      },
    ],
    onChange(emptyStyle) {
      const itemStyle = ctx.settings.section('Interface').get('placeholder-style');

      if (emptyStyle && itemStyle) {
        refreshAllPlaceholderStyles(itemStyle, emptyStyle);
      }
    },
  });
}
