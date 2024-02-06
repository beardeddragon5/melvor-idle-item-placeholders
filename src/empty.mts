import type ItemPlaceholderContext from './context.mjs';

const EMPTY_INITIAL_SIZE = 0;
const EMPTY_GROWTH = 10;

export function empty(id: string, description: string) {
  return {
    id: id,
    name: 'Empty',
    category: 'Empty',
    customDescription: description,
    type: 'Empty',
    itemType: 'Item',
    media: 'assets/empty.png',
    ignoreCompletion: true,
    obtainFromItemLog: false,
    golbinRaidExclusive: false,
    sellsFor: 0,
  };
}

export async function getNextEmpty(ctx: ItemPlaceholderContext) {
  const countEmpties = ctx.accountStorage.getItem('countEmpties') ?? EMPTY_INITIAL_SIZE;
  for (let i = 0; i < countEmpties; i++) {
    const emptyId = `item_placeholder:empty_i_${i}`;
    const item = game.items.getObjectByID(emptyId);
    if (!item) {
      break;
    } else if (!game.bank.items.has(item)) {
      return emptyId;
    }
  }

  const newCountEmpties = Math.min(countEmpties + EMPTY_GROWTH, Number.MAX_SAFE_INTEGER);
  if (newCountEmpties > Number.MAX_SAFE_INTEGER) {
    game.notifications.createErrorNotification(
      `item_placeholder:max_empties`,
      'Got maximum count of empties. You are crazy.',
    );
    throw new TypeError('Got maxium count of empties');
  }

  await ctx.gameData
    .buildPackage((p) => {
      for (let i = countEmpties; i < newCountEmpties; i++) {
        p.items.add(empty(`empty_i_${i}`, ''));
      }
    })
    .add();

  console.info('[Item Placeholder] Increase empty count to', newCountEmpties);
  ctx.accountStorage.setItem('countEmpties', newCountEmpties);

  return `item_placeholder:empty_i_${countEmpties}`;
}

export function removeEmpty(ctx: ItemPlaceholderContext, item: Item) {
  // NOTE: check if item is a index empty
  if (item.localID.startsWith('empty_i_')) {
    // NOTE: ignore removeale for now. Maybe change if fragmentation becomes an issue
  } else {
    const suffix = item.localID.substring(6);
    const empties = ctx.accountStorage.getItem('empties') ?? [];

    const newEmpties = empties.filter((id) => !id.endsWith(suffix));
    ctx.accountStorage.setItem('empties', newEmpties);

    console.info('[Item Placeholder] remove empty', item.localID, 'got', newEmpties);

    const namespace = game.items.namespaceMaps.get(item.namespace);
    if (namespace) {
      namespace.delete(item.localID);
    }

    game.items.registeredObjects.delete(item.id);
  }
}

export async function setupEmpty(ctx: ItemPlaceholderContext) {
  {
    // NOTE: Load legacy empties store
    //       This is needed for old empties to work propertly
    //       There shouldn't be added new empties
    const empties = ctx.accountStorage.getItem('empties') ?? [];

    if (empties.length > 0) {
      console.info('[Item Placeholder] load legacy used empties as item', empties);
      await ctx.gameData
        .buildPackage((p) => {
          empties.map((id) => {
            if (!game.items.getObjectByID(`item_placeholder:${id}`)) {
              p.items.add(empty(id, 'Some big empty. Maybe use a smaller one'));
            }
          });
        })
        .add();
    }
  }

  {
    const countEmpties = ctx.accountStorage.getItem('countEmpties') ?? EMPTY_INITIAL_SIZE;
    console.info('[Item Placeholder] count of empties:', countEmpties);

    await ctx.gameData
      .buildPackage((p) => {
        for (let i = 0; i < countEmpties; i++) {
          if (!game.items.getObjectByID(`item_placeholder:empty_i_${i}`)) {
            p.items.add(empty(`empty_i_${i}`, ''));
          }
        }
      })
      .add();
  }
}
