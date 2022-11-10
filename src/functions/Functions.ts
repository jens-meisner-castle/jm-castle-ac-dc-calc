import {
  AnyDataValue,
  DatapointSequence,
  DatapointState,
  DurationUnit,
  DurationUnits,
  SequenceState,
} from "jm-castle-ac-dc-types";
import { Duration } from "luxon";
import { Matrix } from "mathjs";

export const getSequenceDuration = (
  sequence: DatapointSequence,
  state: SequenceState,
  unit: DurationUnit
) => {
  const { data } = state;
  const first = data.length ? data[0] : undefined;
  const last = data.length ? data[data.length - 1] : undefined;
  if (!first || !last) {
    return 0;
  }
  const { luxonKey } = DurationUnits[unit];
  return Duration.fromMillis(last.at - first.at).as(luxonKey);
};
export const findInSequence = (
  which: "first" | "last",
  sequence: DatapointSequence,
  state: SequenceState,
  callback: (state: DatapointState) => boolean
) => {
  const { data } = state;
  if (which === "first") {
    return data.find(callback);
  } else {
    for (let i = data.length - 1; i >= 0; i--) {
      if (callback(data[i])) {
        return data[i];
      }
    }
    return undefined;
  }
};
export const getSequenceFind = (
  which: "first" | "last",
  sequence: DatapointSequence,
  state: SequenceState,
  value: string | number,
  aspect: "at" | "value"
) => {
  const { data } = state;
  const found =
    typeof value === "string"
      ? findInSequence(which, sequence, state, (s) => s.valueString === value)
      : findInSequence(which, sequence, state, (s) => s.valueNum === value);
  if (!found) {
    return undefined;
  }
  return aspect === "at"
    ? found.at
    : typeof value === "string"
    ? found.valueString
    : found.valueNum;
};
export const getSequenceIntegral = (
  sequence: DatapointSequence,
  state: SequenceState,
  unit: DurationUnit
) => {
  const { data } = state;
  if (data.length < 2) {
    return 0;
  }
  let sum = 0;
  for (let i = 1; i < data.length - 1; i++) {
    const previous = data[i - 1];
    const current = data[i];
    const y = (current.valueNum + previous.valueNum) / 2;
    const dx = current.at - previous.at;
    sum = sum + dx * y;
  }
  return Duration.fromMillis(sum).as(DurationUnits[unit].luxonKey);
};

export const getValueForRange = (
  value: number,
  rawLimits: number[],
  values: AnyDataValue[],
  ifNone: AnyDataValue
) => {
  if (rawLimits.length !== values.length) {
    throw new Error(
      `Limits and values must have the same length. limits: ${rawLimits}, values: ${values}`
    );
  }
  if (!value) {
    return ifNone;
  }
  const index = [...rawLimits]
    .sort((a, b) => a - b)
    .reverse()
    .findIndex((limit) => {
      return value >= limit;
    });
  const result = index > -1 ? values.reverse()[index] : ifNone;
  return result;
};

export const getValueForMathJsRange = (
  value: number,
  limits: Matrix,
  values: Matrix,
  ifNone: AnyDataValue
) => {
  if (limits.size()[0] !== values.size()[0]) {
    throw new Error(
      `Limits and values must have the same length. limits: ${limits}, values: ${values}`
    );
  }
  if (!value) {
    return ifNone;
  }
  const size = limits.size()[0];
  const rawLimits: number[] = [];
  for (let i = 0; i < size; i++) {
    rawLimits.push(limits.get([i]));
  }
  const rawValues: AnyDataValue[] = [];
  for (let i = 0; i < size; i++) {
    rawValues.push(values.get([i]));
  }
  return getValueForRange(value, rawLimits, rawValues, ifNone);
};
