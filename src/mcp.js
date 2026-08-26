import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { planSchema, groupShoppingList } from './plan.js';
import { planToNoteText } from './render.js';
import { savePlan, getPlan, recentPlans, removePlan, searchPlans } from './db.js';

export const PUBLIC_URL = (process.env.PUBLIC_URL || 'https://foodgen.instantoffr.com').replace(/\/+$/, '');

const planUrl = (id) => `${PUBLIC_URL}/n/${id}`;

/** Accept a bare id or a full/partial plan URL, so the model can pass back whatever it has. */
function normaliseId(idOrUrl) {
  const m = String(idOrUrl).trim().match(/([A-Za-z0-9_-]{22})(?:\.txt|\.json)?$/);
  return m ? m[1] : null;
}

const CREATE_DESCRIPTION = `Turn a dinner request into a shopping list + recipe on a phone-friendly web page, and return the link.

Use this whenever someone asks what to make for dinner, asks for a recipe, or asks for a shopping list for a meal.

YOU write the recipe — this tool only stores and publishes it. Before calling, work out the whole dish yourself and honour every constraint in the request:
- Number of people and who they are. Children eat less and prefer milder food: scale amounts sensibly rather than multiplying portions blindly, and echo the make-up back in servings_note.
- Time pressure. "Rask", "før trening", "på 20 minutter" means total_time_minutes must actually be that low — pick a dish that fits instead of rushing a slow one.
- Exclusions and allergies (no fish, vegetarian, no nuts, gluten-free). Never include an excluded ingredient, not even as a garnish or in a sauce.
- Occasion and season if mentioned.

Filling in the fields:
- ingredients: every ingredient the recipe needs, scaled to the group. Give each a realistic quantity with a unit, an aisle in "category", and set at_home=true for staples a household almost certainly has (salt, pepper, cooking oil, butter, standard dried spices). Everything with at_home=false becomes the shopping list, so keep that list accurate and free of duplicates — merge an ingredient used in two steps into one line.
- steps: complete, ordered instructions someone can cook from without guessing amounts or temperatures.
- language: write everything in the language the person asked in. A Norwegian request gets a Norwegian dish name, Norwegian aisles ("Frukt og grønt", "Kjøtt", "Meieri") and Norwegian steps.

One dish per call. For several dinners (a week's plan), call this once per dinner so each gets its own list.

After calling, give the person the returned url and tell them to open it on their phone and tap "Legg i Notater" to save it into Apple Notes.`;

export function createMcpServer() {
  const server = new McpServer(
    { name: 'foodgen', version: '1.0.0' },
    {
      instructions:
        'FoodGen turns a dinner request into a shopping list and recipe, published at a private link the user opens on their phone to save into Apple Notes. The model writes the recipe; the server stores and renders it.',
    },
  );

  server.registerTool(
    'create_dinner_plan',
    {
      title: 'Create dinner plan',
      description: CREATE_DESCRIPTION,
      inputSchema: planSchema.shape,
      outputSchema: {
        id: z.string(),
        url: z.string(),
        title: z.string(),
        items_to_buy: z.number(),
        total_time_minutes: z.number(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (input) => {
      const plan = planSchema.parse(input);
      const { id } = savePlan(plan);
      const url = planUrl(id);
      const { groups } = groupShoppingList(plan.ingredients);
      const itemsToBuy = groups.reduce((n, g) => n + g.items.length, 0);

      const structured = {
        id,
        url,
        title: plan.title,
        items_to_buy: itemsToBuy,
        total_time_minutes: plan.total_time_minutes,
      };

      return {
        content: [
          {
            type: 'text',
            text:
              `Saved "${plan.title}" — ${plan.servings_note}, ${plan.total_time_minutes} min, ` +
              `${itemsToBuy} items to buy.\n\n${url}\n\n` +
              `Open that on your phone and tap "Legg i Notater" to save it into Apple Notes.\n\n` +
              `--- note preview ---\n${planToNoteText(plan, PUBLIC_URL.replace(/^https?:\/\//, ''))}`,
          },
        ],
        structuredContent: structured,
      };
    },
  );

  server.registerTool(
    'get_dinner_plan',
    {
      title: 'Get dinner plan',
      description:
        'Read back a dinner plan that was created earlier, by its id or its url. Use this to answer questions about a plan or to base a new one on it.',
      inputSchema: {
        id: z.string().describe('The plan id, or the full https://.../n/<id> link.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const planId = normaliseId(id);
      const found = planId && getPlan(planId);
      if (!found) {
        return { isError: true, content: [{ type: 'text', text: `No dinner plan found for "${id}".` }] };
      }
      return {
        content: [
          { type: 'text', text: `${planUrl(found.id)}\n\n${planToNoteText(found.plan, null)}` },
        ],
      };
    },
  );

  server.registerTool(
    'list_recent_dinner_plans',
    {
      title: 'List recent dinner plans',
      description:
        'List the most recently created dinner plans on this server, newest first. Useful for "what did we make last week?" or for finding a link the user has lost.',
      inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit }) => {
      const rows = recentPlans(limit);
      if (!rows.length) return { content: [{ type: 'text', text: 'No dinner plans yet.' }] };
      const text = rows
        .map((r) => `- ${r.createdAt.slice(0, 10)} — ${r.title} — ${planUrl(r.id)}`)
        .join('\n');
      return { content: [{ type: 'text', text }] };
    },
  );

  server.registerTool(
    'delete_dinner_plan',
    {
      title: 'Delete dinner plan',
      description: 'Permanently delete a dinner plan and its link. Only call this when the user explicitly asks for it.',
      inputSchema: { id: z.string().describe('The plan id, or the full https://.../n/<id> link.') },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const planId = normaliseId(id);
      const ok = planId ? removePlan(planId) : false;
      return {
        content: [{ type: 'text', text: ok ? `Deleted ${planId}.` : `No dinner plan found for "${id}".` }],
        isError: !ok,
      };
    },
  );

  // ---------------------------------------------------------------------
  // ChatGPT connector compatibility. Outside developer mode, ChatGPT only
  // uses MCP servers that expose `search` and `fetch`, with results encoded
  // as a JSON string in a single text content block (OpenAI's contract).
  // Claude simply sees two extra read-only tools.
  // ---------------------------------------------------------------------

  server.registerTool(
    'search',
    {
      title: 'Search dinner plans',
      description:
        'Search saved dinner plans by dish name, tag or ingredient. Returns matching plans as JSON results with id, title and url. An empty query returns the most recent plans.',
      inputSchema: { query: z.string().default('').describe('Free-text search, e.g. "kylling" or "rask uten fisk". Empty for the newest plans.') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }) => {
      const results = searchPlans(query ?? '', 10).map((r) => ({
        id: r.id,
        title: `${r.title} (${r.createdAt.slice(0, 10)})`,
        url: planUrl(r.id),
      }));
      return { content: [{ type: 'text', text: JSON.stringify({ results }) }] };
    },
  );

  server.registerTool(
    'fetch',
    {
      title: 'Fetch a dinner plan',
      description:
        'Fetch the full shopping list and recipe for one dinner plan by the id returned from search. Returns a JSON document with id, title, text and url.',
      inputSchema: { id: z.string().describe('Plan id from a search result (the full plan URL also works).') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const planId = normaliseId(id);
      const found = planId && getPlan(planId);
      if (!found) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: `No dinner plan found for "${id}".` }) }] };
      }
      const doc = {
        id: found.id,
        title: found.plan.title,
        text: planToNoteText(found.plan, PUBLIC_URL.replace(/^https?:\/\//, '')),
        url: planUrl(found.id),
        metadata: {
          created_at: found.createdAt,
          servings: found.plan.servings_note,
          total_time_minutes: found.plan.total_time_minutes,
          tags: found.plan.tags || [],
        },
      };
      return { content: [{ type: 'text', text: JSON.stringify(doc) }] };
    },
  );

  server.registerPrompt(
    'middag',
    {
      title: 'Middag',
      description: 'Plan tonight\'s dinner and get a shopping list link for your phone.',
      argsSchema: {
        onske: z
          .string()
          .describe('Hvem spiser, hvor lang tid du har, og hva som må unngås. F.eks. "3 personer (2 voksne og 1 barn), rask før fotballtrening, ikke fisk".'),
      },
    },
    ({ onske }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Finn en middag som passer: ${onske}\n\nLag hele oppskriften selv, og lagre den med create_dinner_plan slik at jeg får en lenke jeg kan åpne på mobilen.`,
          },
        },
      ],
    }),
  );

  return server;
}
