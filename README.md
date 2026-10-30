# Stacked Canvas Helper

Keeps Canvas pointer math correct inside stacked tabs so zoom-at-cursor and paste/drop land under the cursor.

## Use

Enable the plugin and work with Canvas in Obsidian's stacked-tab layout. It remeasures the active Canvas before pointer, paste, drag, and drop events. Run **Report canvas rect drift (debug)** to display the difference between Obsidian's cached rectangle and the measured one.

This plugin accesses Obsidian's internal Canvas view fields. Verify it against each supported Obsidian release because those fields can change.

## Install manually

Copy `manifest.json`, `main.js`, and `styles.css` (if present) into `<vault>/.obsidian/plugins/stacked-canvas-helper/`, then enable the plugin in Obsidian.

## Source

This repository contains the installed JavaScript plugin. The original TypeScript source is not available in the vault.

## License

MIT. See [LICENSE](LICENSE).
