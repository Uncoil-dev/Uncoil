import { describe, expect, it } from "vitest";
import { SIGN_UP_INTRO, STONE_PITCH, STOP_FRACTIONS, STOP_HOLD, signInBeat, signUpBeat, stopStones } from "./auth-scene-beats";

describe("sign-up scene", () => {
  it("walks the robot in, then lights the three stops in order and starts again", () => {
    expect(signUpBeat(0.5, false)).toMatchObject({ walking: true, active: null });
    const lit = [0, 1, 2, 3].map((k) => signUpBeat(SIGN_UP_INTRO + k * STOP_HOLD + 0.1, false).active);
    expect(lit).toEqual([0, 1, 2, 0]);
  });

  it("is a still with the robot in place when motion is reduced", () => {
    expect(signUpBeat(0, true)).toEqual({ walk: 1, active: null, walking: false });
  });
});

describe("sign-in scene", () => {
  it("ends with the robot across the bridge and the flag raised, and stays there", () => {
    expect(signInBeat(0, false)).toMatchObject({ cross: 0, flag: 0 });
    for (const t of [5, 60]) expect(signInBeat(t, false)).toEqual({ cross: 1, flag: 1, walking: false });
    expect(signInBeat(0, true)).toEqual({ cross: 1, flag: 1, walking: false });
  });
});

describe("sign-up stops", () => {
  it("stands every stop on a stone of the path, close to where its note sits", () => {
    for (const width of [180, 240, 300]) {
      const stones = stopStones(width);
      stones.forEach((x, i) => {
        expect(x % STONE_PITCH).toBe(0);
        expect(Math.abs(x + 5 - width * STOP_FRACTIONS[i])).toBeLessThanOrEqual(STONE_PITCH / 2);
      });
    }
  });
});
