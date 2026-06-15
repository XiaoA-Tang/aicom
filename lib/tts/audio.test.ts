import { describe, expect, it } from "vitest";

import { createPcm16MonoWav } from "./audio";

describe("createPcm16MonoWav", () => {
  it("wraps PCM audio in a playable WAV container", () => {
    const pcm = Buffer.from([0x01, 0x00, 0xff, 0x7f]);
    const wav = createPcm16MonoWav(pcm, 24000);

    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.subarray(12, 16).toString("ascii")).toBe("fmt ");
    expect(wav.subarray(36, 40).toString("ascii")).toBe("data");
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(pcm.length);
    expect(wav.subarray(44)).toEqual(pcm);
  });
});
