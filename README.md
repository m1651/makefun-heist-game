# The Gilded Fox — A Museum Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/m1651/makefun-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/m1651/makefun-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist in three museum floors. You are the Gilded Fox:
steal every piece of loot, slip past patrolling guards and sweeping
cameras, and vanish through the green door — before the alarm meter fills.

## How to play

- **WASD / arrows** — move
- **Shift** — sneak (slower, much harder to spot)
- **E or click** — toss a coin; nearby guards walk over to investigate it
- **Space** — grab loot when you are close to it
- **P** — pause, **M** — mute

Guards patrol waypoints with ray-cast vision cones; cameras sweep back
and forth. Being seen fills the ALARM meter — fill it and you lose a
life and wake up at the entrance. Vent shafts hide you completely, and
crates and plants block every line of sight. Collect all the loot and
the exit door opens. Finish a floor with the alarm never past half for
a GHOST bonus.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Hand it in with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wwm9ek0a&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
