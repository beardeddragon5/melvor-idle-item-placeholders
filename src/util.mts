import ItemPlaceholderContext from './context.mjs';

export enum PlaceholderStyles {
  None = 'placeholder-none',
  Faded = 'placeholder-faded',
  FadedImage = 'placeholder-faded-image',
  Border = 'placeholder-border',
  Number = 'placeholder-zero',
  NoNumber = 'placeholder-no-number',
  NoNumberFaded = 'placeholder-no-number-faded',
}

export function isPlaceholder(bankItem?: BankItem) {
  return !!bankItem && bankItem.quantity === 0;
}

export function isEmpty(item?: Item): boolean {
  return !!item && item.isModded && item.namespace === 'item_placeholder' && item.localID.startsWith('empty');
}

export function refreshAllPlaceholderStyles(itemStyle: PlaceholderStyles, emptyStyle: PlaceholderStyles) {
  const element = document.getElementById('bank-container');
  if (!element) {
    console.warn('[Item Placeholder] no bank container found');
    return;
  }
  for (const style of Object.values(PlaceholderStyles)) {
    element.classList.remove(style);
    element.classList.remove(style.replace('placeholder', 'empty'));
  }

  element.classList.add(itemStyle, emptyStyle.replace('placeholder', 'empty'));
}

export function refreshAllPlaceholderStylesWithContext(ctx: ItemPlaceholderContext) {
  const section = ctx.settings.section('General');
  const placeholderStyle = section.get('placeholder-style');
  const emptyStyle = section.get('empty-style');

  if (placeholderStyle && emptyStyle) {
    refreshAllPlaceholderStyles(placeholderStyle, emptyStyle);
  }
}
