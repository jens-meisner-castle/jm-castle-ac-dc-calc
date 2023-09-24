import { DatapointSequence, SequenceState } from "jm-castle-ac-dc-types/build";
import { getSequenceDuration } from "../../functions/Functions.js";
import { describe, it } from "vitest";

describe("getSequenceDuration", () => {
  // Arrange
  const start = new Date("2023-01-01 00:00:00");
  const mid = new Date("2023-01-01 06:00:00");
  const end = new Date("2023-01-01 12:00:00");
  const datapointId = "test-datapoint";
  const sequenceId = "test-sequence";
  const sequence: DatapointSequence = {
    id: sequenceId,
    point: {
      id: datapointId,
      name: "just a test",
      valueType: "number",
      valueUnit: "kg",
    },
  };
  const sequenceState: SequenceState = {
    at: end.getTime(),
    id: "test-sequence",
    data: [
      { id: datapointId, valueNum: 1, at: start.getTime() },
      { id: datapointId, valueNum: 2, at: mid.getTime() },
      { id: datapointId, valueNum: 3, at: end.getTime() },
    ],
  };
  // Act
  const duration = getSequenceDuration(sequence, sequenceState, "h");
  // Assert
  it("getSequenceDuration should return the duration of a sequence", ({
    expect,
  }) => expect(duration).toBe(12));
});

describe("getSequenceDuration", () => {
  // Arrange
  const start = new Date("2023-01-01 00:00:00");
  const datapointId = "test-datapoint";
  const sequenceId = "test-sequence";
  const sequence: DatapointSequence = {
    id: sequenceId,
    point: {
      id: datapointId,
      name: "just a test",
      valueType: "number",
      valueUnit: "kg",
    },
  };
  const sequenceState: SequenceState = {
    at: start.getTime(),
    id: "test-sequence",
    data: [{ id: datapointId, valueNum: 1, at: start.getTime() }],
  };
  // Act
  const duration = getSequenceDuration(sequence, sequenceState, "h");
  // Assert
  it("getSequenceDuration should return 0 (zero) for size = 1", ({ expect }) =>
    expect(duration).toBe(0));
});

describe("getSequenceDuration", () => {
  // Arrange
  const datapointId = "test-datapoint";
  const sequenceId = "test-sequence";
  const sequence: DatapointSequence = {
    id: sequenceId,
    point: {
      id: datapointId,
      name: "just a test",
      valueType: "number",
      valueUnit: "kg",
    },
  };
  const sequenceState: SequenceState = {
    at: new Date().getTime(),
    id: "test-sequence",
    data: [],
  };
  // Act
  const duration = getSequenceDuration(sequence, sequenceState, "h");
  // Assert
  it("getSequenceDuration should return 0 (zero) for size = 0", ({ expect }) =>
    expect(duration).toBe(0));
});
