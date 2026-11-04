# Player portraits: sourcing, licensing and the asset pipeline

The player profile (`/players/[id]`) is designed around a large transparent-background cutout. This
document records what was investigated, why no portrait ships today, and how to add one.

## Current state
No portraits are included. Every profile shows a labelled silhouette ("Portrait slot · no licensed
image yet") in the same composition. The design does not change when real cutouts are added.

## What was ruled out
| Source | Why not |
|---|---|
| `image_url` in the Transfermarkt players table | Points at Transfermarkt's CDN; the photos are copyrighted and not covered by the dataset's CC0 licence (which covers the data). The export never reads this column. |
| Club websites, media kits, press galleries | Licensed to media for editorial use, not for reuse in a product. |
| Agency photography (Getty, Reuters, PA and others) | Needs a paid licence per image and use. |
| Scraping search results | Unknown rights for every image; ruled out by the project brief. |
| AI-generated likenesses of real players | Misrepresents real people; not acceptable. |

## What can be used
- **Wikimedia Commons**, where the file page states CC0, CC BY or CC BY-SA. Many professional
  footballers have such photos, but quality varies (crowd shots, side angles, low resolution).
  CC BY and CC BY-SA need the author and licence shown; CC BY-SA cutouts must be shared under the
  same licence.
- **Photos you own or commission**, with a written release (`owned`).

A copyright licence does not settle personality rights. For any public or commercial deployment,
check how the image will be used and get advice where needed.

Wikimedia was not reachable from the cloud session that built this feature, so no candidate files
were reviewed.

## Pipeline
1. **Source** a licensed photo and keep the original file page URL.
2. **Cut out** the player (any background-removal tool, then clean the edges by hand). Export a
   transparent **WebP or PNG**, at least **1400 px tall** (1600 to 2000 recommended), head and
   shoulders down to roughly the waist, with the player facing slightly left so they look into the
   identity column.
3. **Save** it as `web/public/players/portraits/<player_id>.webp`.
4. **Register** it in `web/src/data/portraits.json`:

```json
{
  "player_id": 605184,
  "src": "/players/portraits/605184.webp",
  "kind": "cutout",
  "width": 1200,
  "height": 1600,
  "focus": { "x": 0.5, "y": 0.18 },
  "licence": "CC-BY-SA-4.0",
  "author": "Photographer name",
  "source_url": "https://commons.wikimedia.org/wiki/File:...",
  "attribution": "Photo: Photographer name / Wikimedia Commons, CC BY-SA 4.0"
}
```

5. **Run** `cd web && npm test`. `lib/portraits.test.ts` fails if an entry has a licence outside the
   allow-list (`CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `owned`), is missing its author, source or
   attribution, points anywhere other than a local file, or is a cutout shorter than 1400 px. It also
   checks that the file exists.

The hero shows the attribution and licence under the figure. Use `kind: "photo"` for an
uncut rectangular photo; it is framed and faded rather than composed as a cutout.
