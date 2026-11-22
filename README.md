# The Midnight Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/m1651/makefun-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/m1651/makefun-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game: sneak through three rooms — the Gallery, the Vault Floor and the Penthouse Vault — pocket every piece of loot, and slip out the green getaway door before the alarm fills up. Guards walk patrol routes with sweeping vision cones, wall cameras sweep red cones across the halls, and crates and walls block sight, so every room has several routes through it.

## How to play

- **Move:** WASD or arrow keys
- **Sneak (slow, hard to see):** hold Shift
- **Throw a decoy coin:** click — nearby guards walk over to investigate (3 per level)
- **Win a level:** pocket all the loot, then reach the green EXIT door
- **Lose:** the alarm meter hits 100% while a guard or camera has you in its cone

Score comes from loot (diamond 500, gold 200, painting 150), a time bonus under par, and unused decoy coins. Three lives; getting caught restarts the current room.

## Run it

```sh
python3 -m http.server --directory game 8000
```

Then open http://localhost:8000 in a desktop browser. No build step, no network requests — every file the game loads lives under `game/`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wwm9ek0a&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
