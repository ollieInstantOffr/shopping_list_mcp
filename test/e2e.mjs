import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE = process.env.BASE || 'http://localhost:2400';
const fails = [];
const ok = (cond, msg) => { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) fails.push(msg); };

const client = new Client({ name: 'e2e', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(BASE + '/mcp')));
console.log('\n== connected ==');

const tools = await client.listTools();
console.log('tools:', tools.tools.map(t => t.name).join(', '));
ok(tools.tools.length === 4, 'four tools exposed');
ok(!!tools.tools.find(t => t.name === 'create_dinner_plan')?.inputSchema?.properties?.ingredients, 'create_dinner_plan has ingredients schema');

const prompts = await client.listPrompts();
console.log('prompts:', prompts.prompts.map(p => p.name).join(', '));
ok(prompts.prompts.some(p => p.name === 'middag'), 'middag prompt exposed');

// The user's example request, answered the way Claude would answer it.
const plan = {
  title: 'Rask kyllingwok med nudler',
  summary: 'Ferdig på 20 minutter & mildt nok for barn — perfekt før fotballtrening.',
  servings_note: '3 personer (2 voksne + 1 barn)',
  total_time_minutes: 20,
  tags: ['rask', 'uten fisk', 'før trening'],
  language: 'no',
  ingredients: [
    { item: 'kyllingfilet', quantity: '400 g', category: 'Kjøtt', at_home: false },
    { item: 'wokgrønnsaker', quantity: '1 pk (400 g)', category: 'Frukt og grønt', at_home: false },
    { item: 'vårløk', quantity: '2 stk', category: 'Frukt og grønt', at_home: false },
    { item: 'eggnudler', quantity: '250 g', category: 'Tørrvarer', at_home: false },
    { item: 'soyasaus', quantity: '3 ss', category: 'Tørrvarer', at_home: false },
    { item: 'hvitløk', quantity: '2 fedd', category: 'Frukt og grønt', at_home: false },
    { item: 'rapsolje', quantity: '2 ss', category: 'Tørrvarer', at_home: true },
    { item: 'salt & pepper', quantity: '', category: 'Krydder', at_home: true },
  ],
  steps: [
    'Kok nudlene etter anvisning på pakken. Hell av vannet og sett til side.',
    'Skjær kyllingen i strimler og finhakk hvitløken.',
    'Varm olje i en stekepanne på høy varme og stek kyllingen i 4–5 minutter til den er gjennomstekt.',
    'Ha i hvitløk og wokgrønnsaker, og stek videre i 3 minutter så grønnsakene fortsatt har litt tyggemotstand.',
    'Vend inn nudlene og soyasausen. Smak til med salt og pepper.',
    'Strø over vårløk i skiver og server med en gang.',
  ],
  tips: ['Hold soyasausen på siden til barnet har forsynt seg om du vil ha det ekstra mildt.'],
};

const res = await client.callTool({ name: 'create_dinner_plan', arguments: plan });
const text = res.content[0].text;
console.log('\n---- tool result ----\n' + text + '\n---------------------');
ok(!res.isError, 'create_dinner_plan succeeded');
ok(res.structuredContent?.items_to_buy === 6, 'six items to buy (staples excluded), got ' + res.structuredContent?.items_to_buy);
const url = res.structuredContent.url;
const id = res.structuredContent.id;
ok(url === BASE + '/n/' + id, 'url matches PUBLIC_URL: ' + url);

const roundTrip = await client.callTool({ name: 'get_dinner_plan', arguments: { id: url } });
ok(!roundTrip.isError && roundTrip.content[0].text.includes('Rask kyllingwok'), 'get_dinner_plan accepts a full URL');

const listed = await client.callTool({ name: 'list_recent_dinner_plans', arguments: {} });
ok(listed.content[0].text.includes(id), 'plan appears in list_recent_dinner_plans');

const missing = await client.callTool({ name: 'get_dinner_plan', arguments: { id: 'nope' } });
ok(missing.isError === true, 'unknown id returns an error');

// --- HTTP surfaces ---
const html = await fetch(url);
const page = await html.text();
ok(html.ok, 'GET plan page 200');
ok(page.includes('Rask kyllingwok med nudler'), 'page shows the dish');
ok(page.includes('Legg i Notater'), 'page has the Notes button');
ok(!page.includes('rapsolje</span>') || page.includes('Har du sannsynligvis hjemme'), 'staples in their own section');
const rowCount = (page.match(/class="row"/g) || []).length;
ok(rowCount === 6, 'six checkable rows, got ' + rowCount);
ok(page.includes('&amp;') && !page.match(/var note = [^;]*salt &amp;/), 'note JSON is not HTML-escaped');

const txt = await (await fetch(url + '.txt')).text();
console.log('\n---- .txt (what lands in Apple Notes) ----\n' + txt + '------------------------------------------');
ok(txt.includes('HANDLELISTE') && txt.includes('OPPSKRIFT'), '.txt has both sections');
ok(txt.includes('salt & pepper'), '.txt keeps raw ampersands');
ok(txt.indexOf('Frukt og grønt') < txt.indexOf('Kjøtt'), 'aisles in store-walk order');

const json = await (await fetch(url + '.json')).json();
ok(json.plan.title === plan.title, '.json returns the plan');

ok((await fetch(BASE + '/n/aaaaaaaaaaaaaaaaaaaaaa')).status === 404, 'unknown plan id 404s');
ok((await fetch(BASE + '/n/../etc/passwd')).status === 404, 'path traversal rejected');
ok((await fetch(BASE + '/healthz')).ok, 'healthz ok');
const landing = await (await fetch(BASE + '/')).text();
ok(landing.includes(BASE + '/mcp'), 'landing page shows the MCP url');

const del = await client.callTool({ name: 'delete_dinner_plan', arguments: { id } });
ok(!del.isError, 'delete works');
ok((await fetch(url)).status === 404, 'deleted plan 404s');

await client.close();
console.log('\n' + (fails.length ? 'FAILED: ' + fails.length + '\n - ' + fails.join('\n - ') : 'ALL PASS'));
process.exit(fails.length ? 1 : 0);
