# FoodGen

En MCP-server som gjør en middagsforespørsel om til **handleliste + oppskrift** på en mobilvennlig side — klar til å lagres i Apple Notater.

> «Middag til 3 personer (2 voksne og 1 barn), rask før fotballtrening, ikke fisk.»

Claude finner retten, kaller `create_dinner_plan`, og svarer med en lenke som
`https://foodgen.instantoffr.com/n/Hxe7gVY_YYqRi2CCeZnV5g`. På mobilen:

- **Handleliste** gruppert etter butikk-avdeling, med avkryssing i butikken (huskes på enheten)
- **Oppskrift** med ingredienser og steg under
- **«Legg i Notater»** → delingsark → Notater lagrer alt som ett notat med punktliste
- `…/n/<id>.txt` gir ren tekst, `…/n/<id>.json` gir rådata

## Arkitektur

- **Node 24 + Express**, MCP over **Streamable HTTP** på `/mcp` (stateless — ingen sesjoner, alt ligger i SQLite)
- **SQLite** (`node:sqlite`, ingen native avhengigheter) i et Docker-volum
- Modellen skriver oppskriften; serveren validerer (zod), lagrer og publiserer
- Plan-URLer er 128-bit tilfeldige — ikke gjettbare, ikke indekserte; det er hele tilgangskontrollen

### MCP-flater

| | |
|---|---|
| `create_dinner_plan` | lagrer en full plan, returnerer lenken |
| `get_dinner_plan` | leser en plan tilbake (id eller URL) |
| `list_recent_dinner_plans` | siste planer, nyest først |
| `delete_dinner_plan` | sletter en plan permanent |
| prompt `/middag` | «middag til … »-snarvei |

## Kjøring

```bash
cp .env.example .env      # sjekk PUBLIC_URL
docker compose up -d --build
```

Appen lytter på `127.0.0.1:2400` (styres av `BIND_ADDR`). TLS håndteres av nginx
foran — ferdig site-config med SSE-innstillingene MCP trenger ligger i
[nginx/foodgen.conf](nginx/foodgen.conf):

```bash
sudo cp nginx/foodgen.conf /etc/nginx/sites-available/foodgen.instantoffr.com
sudo ln -s /etc/nginx/sites-available/foodgen.instantoffr.com /etc/nginx/sites-enabled/
sudo certbot --nginx -d foodgen.instantoffr.com
sudo nginx -t && sudo systemctl reload nginx
```

Lokal utvikling uten Docker:

```bash
PUBLIC_URL=http://localhost:2400 npm run dev
```

## Koble til Claude

- **Claude-appen / claude.ai / Cowork**: Settings → Connectors → Add custom connector → `https://foodgen.instantoffr.com/mcp` (ingen autentisering)
- **Claude Code**: `claude mcp add --transport http foodgen https://foodgen.instantoffr.com/mcp`

Forsiden på `https://foodgen.instantoffr.com` viser de samme instruksjonene.

## Test

```bash
docker compose up -d --build   # eller npm start
node test/e2e.mjs              # full MCP + HTTP-runde, 26 sjekker
```

## Miljøvariabler

| Variabel | Standard | |
|---|---|---|
| `PUBLIC_URL` | `https://foodgen.instantoffr.com` | Offentlig origin; lenkene bygges av denne |
| `PORT` | `2400` | HTTP-port inne i containeren |
| `BIND_ADDR` | `127.0.0.1` | Hvor compose publiserer porten |
| `DB_PATH` | `/app/data/foodgen.db` | SQLite-fil (volum) |
| `RETENTION_DAYS` | `0` | Slett planer eldre enn N dager (0 = aldri) |
