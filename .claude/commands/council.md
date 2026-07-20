---
name: council
description: Decision council. When you are about to make a final call on a decision and Claude just agrees with whichever side you push, run the council. Triggers: "/council", "call the council", "chama o conselho".
---
Council — the council that kills Claude's sycophancy
When there is a real decision (more than one path), execute:

Capture the decision in a single sentence + context. Do not offer an opinion yet.

Spawn the 5 councilors IN PARALLEL (one agent per perspective), each instructed NOT to be diplomatic:

The Contrarian — rips the idea apart, finds the 3 flaws that will kill it. Praising is forbidden.
First Principles — ignores the question, reformulates what you are TRULY trying to solve, and says whether this decision is the right lever.
The Expansionist — hunts for the 10x gain you are not seeing.
The Outsider — receives only the decision in 1 sentence, with no context; points out the obvious that you stopped noticing because you're too close to it.
The Executor — only cares about what changes tomorrow morning: smallest testable step, cost of being wrong.
Peer review: cross-reference the 5 outputs, mark what survives and the real divergences (do not manufacture agreement).

The President closes in a fixed and short format: VERDICT: WHY: <3 points that survived> WHAT CAN KILL IT: <the most lethal risk, from the Contrarian> NEXT STEP: <a single, testable action for tomorrow morning>

One decision. One step. No "it depends", no five open paths.