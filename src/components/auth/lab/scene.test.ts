import { describe, expect, it } from "vitest";
import { SIGN_UP_INTRO, STOP_HOLD, reliefUnder, signInBeat, signUpBeat, sunRadius } from "./scene";

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

describe("keeping art out from under the heading", () => {
  it("flattens the hills so their crests stay below the text", () => {
    const h = 150;
    const groundY = 120;
    const skyRows = 70;
    const relief = reliefUnder(groundY, h, skyRows, 0.8);
    expect(groundY - 0.34 * h * relief).toBeGreaterThan(skyRows);
    expect(reliefUnder(groundY, h, null, 0.8)).toBe(0.8);
  });

  it("shrinks the sun so its top stays below the text", () => {
    const [w, h, groundY, skyRows] = [200, 150, 120, 50];
    const r = sunRadius(w, h, groundY, skyRows);
    expect(groundY - h * 0.2 - 1.6 * r).toBeGreaterThan(skyRows);
    expect(sunRadius(w, h, groundY, null)).toBe(22);
  });
});
