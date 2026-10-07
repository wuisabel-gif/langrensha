# Nightfall · Werewolf Game / 夜幕 · 狼人杀

**English** | [简体中文](README.zh-CN.md)

A multiplayer social deduction game with Chinese and English interfaces, original anime role cards, masked identities, and a moonlit village setting. Nightfall has its own repository, deployment and database, separate from TRUST / FALL.

## Play online

[Play in English](https://yemu-langrensha.actionintime.chatgpt.site/?lang=en) · [中文版](https://yemu-langrensha.actionintime.chatgpt.site/?lang=zh)

1. Enter a nickname, create a room, and share its code or invite link.
2. Friends join from their own devices. Use **Fill with AI** if you need more players.
3. Once all human players are ready, the host starts. Roles are assigned randomly; click **Reveal role** to see your card.
4. Follow the prompts for private night actions, turn-based text discussion and voting. The server synchronizes every screen and resolves the results.

No login, installation or external AI API key is needed. AI players use built-in strategies, not a language model. They receive only their own private role information and public records. Wolves can lie about their role; AI statements are claims, not verified facts.

## Language and faster AI practice

Choose **中文 / English** in the header. Each player chooses independently, so English and Chinese players can share a room. The interface, rules, system events, actions and AI dialogue are translated. Player names and human chat remain unchanged. Switching language does not reset the match.

The host can choose **AI speed → Fast** in the lobby. With AI seats present, night phases last **8 seconds**, AI acts in about **1 second**, and dawn lasts **3 seconds**. Human speaking and voting limits stay unchanged. All-human games use normal timing. The setting carries over to rematches.

## Setups and roles

| Setup | Roles | Werewolf victory condition |
|---|---|---|
| 6-player Quick | 2 Wolves, Seer, Witch, 2 Villagers | Living wolves equal or outnumber Town |
| 9-player Classic | 3 Wolves, Seer, Witch, Hunter, 3 Villagers | Eliminate every Town player |
| 12-player Guard | 4 Wolves, Seer, Witch, Hunter, Guard, 4 Villagers | Eliminate all Villagers or all special Town roles |

Town wins by eliminating all wolves. A match is a draw after 12 day/night cycles.

- Night phases last a fixed 15 seconds normally, or 8 seconds in Fast mode with AI. A role's death does not change its phase duration.
- Wolves must agree on a target or no attack happens. They may target themselves. Wolf chat is private to the pack.
- The Witch has one antidote and one poison per match, can use at most one per night, and cannot save herself. After using the antidote, she no longer sees the attack target.
- The Guard cannot protect the same player on consecutive nights. Protection and antidote on the same target cancel each other. Poison ignores protection.
- The Hunter may shoot when killed by wolves or voted out, but not when poisoned. A winning wolf attack takes priority over remaining effects.
- The Seer privately learns whether a checked player is a wolf, not their exact role.
- Day discussion proceeds in turns, with a host-selected limit of 20/30/45/60 seconds. Players may end their turn early. Speaking direction alternates from day two.
- Votes stay secret until resolution. Tied players speak in a runoff but cannot vote in it; another tie means no elimination. Missing the 30-second vote deadline is an abstention.
- Players eliminated on the first night or during the day get last words. Later night deaths do not. Death does not reveal roles; the Hunter reveals before shooting, and all roles appear at match end.
- Late joiners spectate. At rematch, humans get priority over AI seats; anyone beyond the setup's capacity remains a spectator.

This scoped online edition **does not include Sheriff elections, badges, Cupid/Lovers, Idiot or wolf self-reveal**. It does not implement every regional or tabletop variant. Full rules are also available inside the game.

## Screenshots

![English entry and role introduction](docs/screenshots/05-english-entry.png)
![Masked identities and multiplayer lobby](docs/screenshots/04-masked-lobby.png)
![Discussion during a multiplayer test match](docs/screenshots/02-discussion.png)

<details>
<summary>Mobile view</summary>

<img src="docs/screenshots/03-mobile.png" alt="Mobile multiplayer interface" width="390" />

</details>

Screenshots come from local browser sessions and include Chinese UI examples. Pictured room codes are examples, not permanent invitations.

## More gameplay screenshots

### English lobby and AI settings

![English room setup with Fast AI enabled](docs/screenshots/06-english-lobby.png)

### Reveal your secret role

![Private role reveal at the start of a match](docs/screenshots/08-secret-role.png)

### Night phase

![Night phase with private identity and synchronized timer](docs/screenshots/09-night-phase.png)

### Fast AI on mobile

<img src="docs/screenshots/07-fast-ai-mobile.png" alt="Fast AI settings in the mobile lobby" width="390" />

## Architecture and privacy

React / Vinext → same-origin API → Cloudflare D1.

Browsers poll a server-authoritative view every second. Compare-and-swap updates prevent concurrent requests from overwriting each other. The explicit `view()` response hides other players' roles, night choices, checks and credentials. Pending ballots stay private. The server enforces action restrictions for spectators, eliminated players and players outside their speaking turn.

Seat credentials live in the current tab's sessionStorage. Room state lives in a dedicated D1 database. Rooms expire after 24 hours; room creation deletes records that have not been updated for more than 24 hours.

## Local development

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run db:local
npm run dev
```

Run `npm run db:local` to apply committed migrations before first play. After changing the schema, run `npm run db:generate`, then apply local migrations. Vite uses the local `DB` binding with database ID `00000000-0000-4000-8000-000000000000`; local state is persisted in `.wrangler/state`. Sites applies committed migrations during production publication.

```sh
npm run test:game
npm run test:api
npm run test:i18n
npx tsc --noEmit --incremental false
npm run build
```

Game tests cover role privacy, wolf chat, checks, potions, Guard/Hunter interactions, wolf-kill priority, ties, victory conditions, fast timing and 24 complete AI matches. API tests use real handlers with in-memory SQLite and a controlled clock to cover mixed human/AI games, concurrent retries, authentication and rematch cleanup. Localization tests cover catalogs, action labels, system events, AI dialogue and results across all presets.

Browser checks include desktop/mobile layouts, mixed English/Chinese clients, synchronized play, role privacy and reload recovery. Physical devices and large concurrent audiences have not been load-tested.

## Source and artwork

[Public source repository](https://github.com/wuisabel-gif/langrensha). Original role portraits, masked identity artwork and the village background were generated with imagegen. Asset paths, generation notes and font licensing are documented in [art assets](docs/art-assets.md).
