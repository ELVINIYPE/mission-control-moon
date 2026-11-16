🌙 Mission Control: Moon

NASA Space Apps Challenge 2026 · Toronto · Challenge: Space Mission Design Game
Team StarHunters · Elvin Iype Mathew (solo team: the only member)

> Aarav is sixteen. He thinks space means "zero gravity". But the Moon, the Space Station and every satellite are falling toward Earth every second.
> Mission Control: Moon* lets students aged 10+ feel the physics by flying a complete Apollo 11 mission, from design to splashdown.

---

## ▶️ How to play

1. Download or clone this repository.
2. Open `index.html` in Google Chrome (no install, no server needed).
3. Press ▶ START MISSION for the full game (about 18 minutes), or 🎬 Demo for the fast version used for judging.

The game is plain HTML + CSS + JavaScript with [three.js r128](https://threejs.org/) for 3D. It also works on GitHub Pages.

## 🚀 What the player does

| Part | What you do | What you learn |
|---|---|---|
| Design| Budget ($2B + optional loan), rocket, stack, fuel and oxidizer for every stage, crew, Command Module, Lunar Module, safety, launch window, spacesuits | Payload ↔ rocket ↔ fuel mass; why rockets carry their own oxygen |
| Launch | Go/No-Go poll, countdown, staging, parking orbit at 7.8 km/s | Staging; orbit = falling sideways fast enough to keep missing Earth |
| TLI (2D) | Burn at the right moment to 10.8 km/s | Too slow → fall back; too fast → escape Earth's gravity |
| Moon arrival | Brake on the near side below 1.8 km/s on a figure-8 free-return path | Free return (Apollo 13), Kepler's 2nd law (fast near, slow far) |
| Moon orbit | Send 3 messages to Earth; the far side blocks the radio | Radio shadow, far-side photo (Luna 3, 1959) |
| Landing | Engine vs parachute; fly the descent | No air → no parachute; Moon gravity 1.62 m/s² |
| Moonwalk | Flag, Moon buggy (build it), rocks + special rock, PROMISE water-hunting rover, laser mirror, seismometer | Myth-busting (flag, footprints, radio delay), why water on the Moon matters |
| Home | Ascent, docking, crew + rock transfer, TEI burn, CM/SM separation, re-entry, parachutes, splashdown | Heat shield (~2,760 °C), radio blackout, drogue + main chutes |

Every mistake explains **why** it happened, so the player can adjust and try again.

## 🤖 PROMISE rover (hardware prototype)

PROMISE is our own rover concept (the name is ours, not a NASA mission). In the game it scans the soil and finds water ice.
Our physical prototype is an Arduino UNO R4 Minima 4-wheel rover (4 TT gear motors, L298N driver) with a soil-moisture sensor that detects water in soil.
Next step: drive the rover from the game.

## 📊 NASA data and facts used

All mission numbers come from published NASA sources about Apollo 11 and other NASA missions. No ESA or other agency data is used. No raw telemetry files are bundled.

| Value used in the game | Source |
|---|---|
| S-IC separation ≈ 67 km, T+2:42; parking orbit ≈ 7.8 km/s, ≈ 190 km; TLI ≈ 10.8 km/s | NASA Apollo 11 Mission Report (MSC-00171) and Saturn V Flight Evaluation Report AS-506 |
| LOI ≈ 0.89 km/s (5 min 57 s); TEI ≈ 1 km/s; free-return trajectory | NASA *Apollo 11 Mission Report*; NASA Apollo 11 Press Kit |
| Entry interface 122 km at ≈ 11 km/s; drogues ≈ 7.3 km; mains ≈ 3 km; splashdown ≈ 35 km/h; 8 d 3 h 18 min; USS Hornet | NASA *Apollo 11 Mission Report* |
| Heat shield up to ≈ 2,760 °C; 3 main parachutes | NASA Apollo Command Module fact sheets |
| Moon gravity 1.62 m/s²; Earth–Moon distance 363,300–405,500 km; radio delay ≈ 1.28 s each way | NASA Moon Fact Sheet (NSSDCA) |
| 21.5 kg of samples returned | NASA Apollo 11 mission page |
| Laser mirror (100 reflectors); Moon recedes ≈ 3.8 cm/year | NASA Lunar Laser Ranging / Apollo 11 LRRR |
| Genesis Rock (Apollo 15), > 4 billion years old | NASA Apollo 15 mission pages |
| Water ice in permanently shadowed craters (LCROSS, 2009) | NASA LCROSS mission results |
| Spacesuit layers (cooling garment, pressure bladder, restraint, thermal micrometeoroid garment, PLSS) | NASA spacesuit (EMU / A7L) resources |
| Artemis South Pole base idea (ice → water → hydrogen + oxygen) | NASA Artemis program overview |

Some values are rounded or visually scaled (for example, orbit sizes are not to scale) so that the game is clear for students.

## 🧠 Use of AI (Artificial Intelligence) — disclosure

- Yes, AI was used. Most of the code was written by Claude (Anthropic AI), working step by step from Elvin's game design, requirements and feedback.
- AI also helped with: checking science numbers, game text for 12-year-olds, the pitch story, the 30-second video (made from in-game 3D screenshots), and this README.
- Human work (Elvin, solo): the idea, game design, every gameplay decision, testing every part, the science communication approach, the Arduino PROMISE rover hardware, and the final review.
- No AI-generated images of real people are used. The astronaut face is Elvin's own photo. The in-game voices use the browser's built-in speech.

## 📁 Code layout

```
index.html            start page (+ 🎬 Demo button)
css/                  styles
js/intro.js           opening 3D scene
js/players.js         players, avatars, crew room
js/choice.js          mission vs Training Academy
js/academy.js, js/lessons/   Training Academy lessons
js/mission/apollo-*.js       Apollo 11+ mission (design, flight, Moon orbit, landing, moonwalk, return, re-entry)
2d/                   2D orbit game (parking orbit → TLI → coast)
```

## 📜 License

Code: MIT. three.js: MIT (© three.js authors). NASA facts are public information; this project is not endorsed by NASA.
