import ItemPlaceholderContext from './context.mjs';

export enum PlaceholderStyles {
  None = 'none',
  Faded = 'faded',
  FadedImage = 'faded-image',
  Border = 'border',
  Number = 'zero',
  NoNumber = 'no-number',
  NoNumberFaded = 'no-number-faded',
  NoDisplay = 'no-display',
}

export function isPlaceholder(bankItem?: BankItem) {
  return !!bankItem && bankItem.quantity === 0;
}

export function isEmpty(item?: Item): boolean {
  return !!item && item.isModded && item.namespace === 'item_placeholder' && item.localID.startsWith('empty');
}

export function refreshAllPlaceholderStyles(
  itemStyle: PlaceholderStyles,
  emptyStyle: PlaceholderStyles,
  potionStyle: PlaceholderStyles,
) {
  {
    const element = document.getElementById('bank-container');
    if (!element) {
      console.warn('[Item Placeholder] no bank container found');
    } else {
      refreshAllPlaceholderStylesOnElement(element, itemStyle, emptyStyle, potionStyle);
    }
  }
  {
    const element = document.getElementById('potion-select-menu-modal');
    if (!element) {
      console.warn('[Item Placeholder] no potion selection menu found');
    } else {
      refreshAllPlaceholderStylesOnElement(element, itemStyle, emptyStyle, potionStyle);
    }
  }
  {
    const element = document.getElementById('skill-footer-minibar-items-container');
    if (!element) {
      console.warn('[Item Placeholder] no quick equip menu found');
    } else {
      refreshAllPlaceholderStylesOnElement(element, itemStyle, emptyStyle, potionStyle);
    }
  }
}

export function refreshAllPlaceholderStylesOnElement(
  element: HTMLElement,
  itemStyle: PlaceholderStyles,
  emptyStyle: PlaceholderStyles,
  potionStyle: PlaceholderStyles,
) {
  for (const style of Object.values(PlaceholderStyles)) {
    element.classList.remove(`placeholder-${style}`);
    element.classList.remove(`empty-${style}`);
    element.classList.remove(`potion-${style}`);
  }

  element.classList.add(`placeholder-${itemStyle}`, `empty-${emptyStyle}`, `potion-${potionStyle}`);
}

export function refreshAllPlaceholderStylesWithContext(ctx: ItemPlaceholderContext) {
  const section = ctx.settings.section('Interface');
  const placeholderStyle = section.get('placeholder-style');
  const emptyStyle = section.get('empty-style');
  const potionStyle = section.get('potion-style');

  if (placeholderStyle && emptyStyle && potionStyle) {
    refreshAllPlaceholderStyles(placeholderStyle, emptyStyle, potionStyle);
  }
}
