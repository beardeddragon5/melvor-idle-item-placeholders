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

function getUIBankItem(itemID: string) {
  return document.querySelector(`bank-item-icon[data-item-id="${itemID}"]`);
}

export function refreshAllPlaceholderStyles(itemStyle: PlaceholderStyles, emptyStyle: PlaceholderStyles) {
  for (const bankItem of game.bank.items.values()) {
    setItemPlaceholderStyle(bankItem, itemStyle, emptyStyle);
  }
}

export function setItemPlaceholderStyle(
  bankItem: BankItem,
  itemStyle: PlaceholderStyles,
  emptyStyle: PlaceholderStyles,
  retry: number = 0,
) {
  const element = getUIBankItem(bankItem.item.id);
  if (!element && retry >= 2) {
    console.warn('[Item Placeholder] try requesting item not found in ui:', bankItem.item.id);
    return;
  } else if (!element) {
    setTimeout(setItemPlaceholderStyle, 100, bankItem, itemStyle, emptyStyle, retry + 1);
    return;
  }

  for (const style of Object.values(PlaceholderStyles)) {
    element.classList.remove(style);
  }

  if (isPlaceholder(bankItem)) {
    element.classList.add(isEmpty(bankItem.item) ? emptyStyle : itemStyle);
  }
}

export function setItemPlaceholderStyleWithContext(ctx: ItemPlaceholderContext, bankItem: BankItem) {
  const section = ctx.settings.section('General');
  const placeholderStyle = section.get('placeholder-style');
  const emptyStyle = section.get('empty-style');

  if (placeholderStyle && emptyStyle) {
    setItemPlaceholderStyle(bankItem, placeholderStyle, emptyStyle);
  }
}
