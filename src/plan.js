import { z } from 'zod';

/**
 * Store-walk order. Anything the model invents that is not in this list is kept
 * (we never drop an ingredient) and sorted to the end.
 */
export const CATEGORY_ORDER = [
  'Frukt og grønt',
  'Bakeri',
  'Kjøtt',
  'Fisk',
  'Meieri',
  'Tørrvarer',
  'Krydder',
  'Hermetikk',
  'Frys',
  'Drikke',
  'Annet',
];

export const ingredientSchema = z.object({
  item: z.string().min(1).describe('Ingredient name, e.g. "kyllingfilet" / "chicken breast".'),
  quantity: z.string().default('').describe('Amount with unit, e.g. "500 g", "2 stk", "1 ss". Empty string if not applicable.'),
  category: z
    .string()
    .default('Annet')
    .describe(
      `Grocery aisle, used to group the shopping list. Prefer one of: ${CATEGORY_ORDER.join(', ')}. Translate these to the plan language if it is not Norwegian.`,
    ),
  at_home: z
    .boolean()
    .default(false)
    .describe(
      'True for staples most households already have (salt, pepper, oil, butter, common dry spices). These are listed separately so the shopping list stays short.',
    ),
});

export const planSchema = z.object({
  title: z.string().min(1).describe('Name of the dish, in the language of the request.'),
  summary: z.string().default('').describe('One appetising sentence about the dish. Optional.'),
  servings_note: z
    .string()
    .min(1)
    .describe('Who is eating, echoed from the request, e.g. "3 personer (2 voksne + 1 barn)".'),
  total_time_minutes: z.number().int().positive().describe('Realistic total time from start to food on the table.'),
  tags: z
    .array(z.string())
    .default([])
    .describe('Short constraint labels honoured by this plan, e.g. ["rask", "uten fisk", "før fotballtrening"].'),
  ingredients: z
    .array(ingredientSchema)
    .min(1)
    .describe('Every ingredient needed, scaled to the number of people. Do not repeat the same item twice — merge amounts.'),
  steps: z.array(z.string().min(1)).min(1).describe('Numbered cooking steps, each a complete instruction.'),
  tips: z.array(z.string()).default([]).describe('Optional extras: swaps, what to serve alongside, make-ahead notes.'),
  language: z
    .string()
    .default('no')
    .describe('BCP-47 code for the language the plan text is written in. Match the language the user asked in.'),
});

/** Split into what you must buy vs. what is probably already in the cupboard, grouped by aisle. */
export function groupShoppingList(ingredients) {
  const toBuy = ingredients.filter((i) => !i.at_home);
  const atHome = ingredients.filter((i) => i.at_home);

  const byCategory = new Map();
  for (const ing of toBuy) {
    const key = ing.category?.trim() || 'Annet';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(ing);
  }

  const groups = [...byCategory.entries()].sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'nb');
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return { groups: groups.map(([category, items]) => ({ category, items })), atHome };
}

export function formatIngredient(ing) {
  return ing.quantity ? `${ing.quantity} ${ing.item}` : ing.item;
}
