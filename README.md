# youtube-publish-drafts

A browser-console script for YouTube Studio that automates two chores the Studio UI makes you
click through one video at a time: **publishing every draft video** in your Content list, and
**alphabetically sorting a playlist**. It works by driving the real Studio UI (clicking buttons,
waiting for dialogs), not by calling any YouTube API — see [Limitations](#limitations-and-failure-modes)
below for what that means in practice.

Fork of [Niedzwiedzw/youtube-publish-drafts](https://github.com/Niedzwiedzw/youtube-publish-drafts),
maintained here with fixes for YouTube Studio's evolving UI (last verified against the Studio UI
as of November 2025 — see `git log` for the exact history of UI-adaptation fixes).

![quick demo](youtube-publisher-demo.gif)

## Install / usage

There is nothing to install. The script is pasted directly into the browser console:

1. Go to YouTube Studio's **Content** page (`studio.youtube.com/channel/.../videos/upload`).
2. Open developer tools (F12) and switch to the **Console** tab.
3. Open [`youtube-publish-drafts.js`](youtube-publish-drafts.js), copy its entire contents, and
   paste them into the console. Press Enter.
4. Watch the console log (see [Config](#config) to turn this off) and wait — it processes one
   draft at a time and does not return control until every visible draft has been handled.

**This automates clicks in the Studio UI on your behalf, which is against
[YouTube's Terms of Service](https://www.youtube.com/t/terms)** (automating interactions with the
Service). Use at your own risk and at your own judgment.

## Config

All configuration is at the top of `youtube-publish-drafts.js` — edit the constants directly
before pasting, there is no separate config file or command-line flag:

| Constant | Values | Purpose |
|---|---|---|
| `MODE` | `'publish_drafts'` (default) or `'sort_playlist'` | Which of the two behaviors below runs when the script is pasted |
| `DEBUG_MODE` | `true` (default) / `false` | Logs each step to the console as `[YT-Bot] ...`; turn off for quiet runs |
| `MADE_FOR_KIDS` | `true` / `false` (default) | Sets the "Made for Kids" radio button on each draft before publishing |
| `VISIBILITY` | `'Public'` / `'Private'` / `'Unlisted'` (default) | Visibility set on each draft when it is published |
| `SORTING_KEY` | a JS comparator (default: locale-aware, numeric-aware name compare) | Only used in `sort_playlist` mode; controls the order videos are sorted into |

### Mode: `publish_drafts` (default)

Scans the Content page for every row with an "edit draft" button, then for each one: opens its
edit dialog, sets **Made for Kids** and **Visibility** per the config above, clicks through to
Save, and waits for and dismisses the "Video published" confirmation dialog before moving to the
next draft.

### Mode: `sort_playlist`

Run on a **playlist's video list page**, not the Content page. Reads every video row, sorts them
in-memory using `SORTING_KEY`, then repeatedly opens each video's row menu and clicks **Move to
bottom** in sorted order, which reassembles the whole playlist into that order one move at a time.

## Limitations and failure modes

- **UI automation, not an API integration.** The script finds buttons and dialogs by CSS
  selector (`querySelectorDeep`, which also pierces Shadow DOM, since Studio's `ytcp-*` elements
  use it) and by waiting up to `DEFAULT_ELEMENT_TIMEOUT_MS` (15 seconds) for each one to appear.
  When YouTube changes Studio's markup, a selector can stop matching and a step will silently
  time out (logged as `TIMED OUT: Could not find <selector>` when `DEBUG_MODE` is on) rather than
  raise a visible error. If drafts stop being processed, this is the first thing to check.
- **No dry-run mode.** There is no confirmation step — pasting the script with
  `MODE = 'publish_drafts'` immediately starts publishing every visible draft with whatever
  `VISIBILITY`/`MADE_FOR_KIDS` you configured. Double-check the config constants before pasting.
- **Processes what is currently visible/loaded** in the Content page's row list; it does not
  scroll or paginate to load more drafts first.
- **No undo.** Once a draft is published (even as Unlisted), reverting it back to a draft/private
  state is a manual Studio action this script does not perform.
- **Against YouTube's Terms of Service** (see above) — this may put your channel at risk in a way
  the script itself cannot prevent or warn about at runtime.
- **`sort_playlist` mutates playlist order destructively as it runs** — if the script is stopped
  partway through (tab closed, page navigated away), the playlist is left partially reordered,
  not rolled back.

## Support

- Discord: https://discord.gg/xj6JxW8k
- BTC (support development): `bc1qksrtrwkhq043h56rsh9d4zdnmk0d43tm4m6xux`

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE). Copyright retained by the original author (Wojciech Niedźwiedź,
2020) per the upstream project this is forked from.

## How to cite

See [`CITATION.cff`](CITATION.cff) for citable metadata for this fork specifically.
