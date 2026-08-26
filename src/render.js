import { groupShoppingList, formatIngredient } from './plan.js';

const STRINGS = {
  no: {
    shoppingList: 'Handleliste',
    atHome: 'Har du sannsynligvis hjemme',
    recipe: 'Oppskrift',
    ingredients: 'Ingredienser',
    method: 'Slik gjør du',
    tips: 'Tips',
    minutes: 'min',
    addToNotes: 'Legg i Notater',
    copy: 'Kopier',
    copied: 'Kopiert!',
    sharing: 'Del → velg Notater',
    shareHint:
      'Trykk «Legg i Notater», velg <b>Notater</b> i delingsmenyen, og lagre. Fungerer ikke det, trykk «Kopier» og lim inn i et nytt notat.',
    copiedHint: 'Åpne Notater, lag et nytt notat og lim inn.',
    noShareHint: 'Åpne denne siden på mobilen for å legge den rett i Notater. Her kan du kopiere teksten og lime den inn selv.',
    plainText: 'Vis som ren tekst',
    madeWith: 'Laget med',
    notFound: 'Fant ikke middagen',
    notFoundBody: 'Lenken er feil, eller planen er slettet. Be Claude lage en ny.',
    checkedOff: 'i handlekurven',
    reset: 'Nullstill',
    added: 'Lagt til',
    addPlaceholder: 'Legg til vare …',
    addFailed: 'Fikk ikke lagret — prøv igjen.',
  },
  en: {
    shoppingList: 'Shopping list',
    atHome: 'You probably have these',
    recipe: 'Recipe',
    ingredients: 'Ingredients',
    method: 'Method',
    tips: 'Tips',
    minutes: 'min',
    addToNotes: 'Add to Notes',
    copy: 'Copy',
    copied: 'Copied!',
    sharing: 'Share → pick Notes',
    shareHint:
      'Tap “Add to Notes”, choose <b>Notes</b> in the share sheet, and save. If that does not appear, tap “Copy” and paste into a new note.',
    copiedHint: 'Open Notes, create a new note and paste.',
    noShareHint: 'Open this page on your phone to send it straight to Notes. Here you can copy the text and paste it yourself.',
    plainText: 'View as plain text',
    madeWith: 'Made with',
    notFound: 'Dinner not found',
    notFoundBody: 'The link is wrong, or the plan was deleted. Ask Claude for a new one.',
    checkedOff: 'in the basket',
    reset: 'Reset',
    added: 'Added',
    addPlaceholder: 'Add an item …',
    addFailed: 'Could not save — try again.',
  },
};

export function strings(language) {
  return String(language || 'no').toLowerCase().startsWith('en') ? STRINGS.en : STRINGS.no;
}

/**
 * The exact text that ends up in Apple Notes. Plain UTF-8 with "•" bullets —
 * Notes renders these as-is, which is what a paste or a share-sheet save produces.
 */
export function planToNoteText(plan, publicUrl) {
  const t = strings(plan.language);
  const { groups, atHome } = groupShoppingList(plan.ingredients);
  const out = [];

  out.push(plan.title);
  const meta = [plan.servings_note, `${plan.total_time_minutes} ${t.minutes}`, ...(plan.tags || [])]
    .filter(Boolean)
    .join(' · ');
  if (meta) out.push(meta);
  if (plan.summary) out.push('', plan.summary);

  out.push('', t.shoppingList.toUpperCase(), '');
  for (const group of groups) {
    out.push(group.category);
    // "[] " at line start becomes a real checkbox when saved into Apple Notes.
    for (const item of group.items) out.push(`[] ${formatIngredient(item)}`);
    out.push('');
  }
  if (plan.extras?.length) {
    out.push(t.added);
    for (const extra of plan.extras) out.push(`[] ${extra.item}`);
    out.push('');
  }
  if (atHome.length) {
    out.push(t.atHome);
    for (const item of atHome) out.push(`[] ${formatIngredient(item)}`);
    out.push('');
  }

  out.push(t.recipe.toUpperCase(), '');
  out.push(t.ingredients);
  for (const ing of plan.ingredients) out.push(`• ${formatIngredient(ing)}`);
  out.push('', t.method);
  plan.steps.forEach((step, i) => out.push(`${i + 1}. ${step}`));

  if (plan.tips?.length) {
    out.push('', t.tips);
    for (const tip of plan.tips) out.push(`• ${tip}`);
  }

  if (publicUrl) out.push('', `${t.madeWith} ${publicUrl}`);

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
