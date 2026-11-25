[![make.fun](https://make.fun/badge/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363.svg)](https://make.fun/bounty/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363?utm_source=github&utm_medium=readme&utm_campaign=u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363)
[![rank](https://make.fun/badge/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/qw123gyj-dev/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/rank.svg)](https://make.fun/bounty/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363)
[![reward](https://make.fun/badge/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/qw123gyj-dev/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363/reward.svg)](https://make.fun/bounty/u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363?utm_source=github&utm_medium=readme&utm_campaign=u-shino-make-the-ai-judge-feel-nostalgic-a-childhood-625d3363)

# Make the AI Judge Feel Nostalgic: A Childhood Memory

A deterministic entry picker for the make.fun bounty "Make the AI Judge Feel Nostalgic: A Childhood Memory". `main.ts` scores 15 hand-written candidate one-liners against the judge's brief — in the brief's own order: a childhood memory that makes the judge feel nostalgic; grounding in a concrete place, time or sensation, such as a kitchen, a summer evening or the smell of fresh rice; small honest detail that sounds like it truly happened rather than a greeting-card sentiment; a single clean sentence inside the 280 character limit, with every word earning its place; and a warm ache that lingers after the sentence ends — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–280 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line with no concrete grounding is capped on nostalgia and grounding alike, greeting-card sentiment is docked hard on authenticity and on the lingering ache, and the ache bonus only counts when the ache lands inside the final eight words, so the sentence ends on feeling instead of logistics.

The winning line:

> My grandmother braided my hair on the porch every morning before school, humming the same song, and the smell of her soap is still the smell of home.

It grounds the memory in a place (the porch), a time (every morning before school) and a sensation (the smell of her soap), carries the small honest detail of the same hummed song every morning, and ends on the ache that the smell of home never left.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/nostalgia-out node main.ts
cat /tmp/nostalgia-out/entry.txt
```
