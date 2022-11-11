import {
  AnyDataValue,
  Datapoint,
  DatapointSequence,
  DatapointState,
  DatapointValueType,
  DatapointValueUnit,
  DurationUnits,
  isDurationUnit,
  SequenceState,
  UniqueDatapoint,
} from "jm-castle-ac-dc-types";
import { DateTime } from "luxon";
import { all, create, import as mathImport, isResultSet, Matrix } from "mathjs";
import {
  getSequenceDuration,
  getSequenceFind,
  getSequenceIntegral,
  getValueForMathJsRange,
} from "../functions/Functions.js";

export const isDefined = (...values: unknown[]) =>
  values.every(
    (v) =>
      v !== null &&
      v !== undefined &&
      (typeof v !== "number" || !Number.isNaN(v))
  );

const extendMath = (imports: Record<string, unknown>) => {
  const importOptions: math.ImportOptions = {};
  const configOptions: math.ConfigOptions = {};
  const math = create(all, configOptions);
  mathImport && mathImport(imports, importOptions);
  return math;
};

export interface CalcReferences {
  datapoints: string[];
  sequences: string[];
  error?: string;
}

export const findReferences = (code: string): CalcReferences => {
  const datapoints: Record<string, null> = {};
  const sequences: Record<string, null> = {};
  const getValue = (key: string): number | string | undefined => {
    datapoints[key] = null;
    return 1;
  };
  const seqDuration = (sequenceId: string, resultUnit: string) => {
    sequences[sequenceId] = null;
    return 1;
  };
  const seqFind = (
    which: string,
    sequenceId: string,
    value: number | string,
    aspect: string
  ): string | number | undefined => {
    sequences[sequenceId] = null;
    return undefined;
  };
  const seqIntegral = (sequenceId: string, timeUnit: string) => {
    sequences[sequenceId] = null;
    return 1;
  };

  const math = extendMath({
    isDef: function (...value: unknown[]) {
      return isDefined(...value);
    },
    get: function (key: string) {
      return getValue(key);
    },
    seqDuration: function (sequenceId: string, valueUnit: string) {
      return seqDuration(sequenceId, valueUnit);
    },
    seqFind: function (
      which: string,
      sequenceId: string,
      value: string | number,
      aspect: string
    ) {
      return seqFind(which, sequenceId, value, aspect);
    },
    seqIntegral: function (sequenceId: string, timeUnit: string) {
      return seqIntegral(sequenceId, timeUnit);
    },
    valueForRange: function (
      value: number,
      limits: Matrix,
      values: Matrix,
      ifNone: AnyDataValue
    ) {
      return getValueForMathJsRange(value, limits, values, ifNone);
    },
  });
  if (!math.compile) {
    throw new Error(
      `Fatal error (math.compile is undefined): Unable to find references in DatapointCalculator.`
    );
  }
  const evalFunction = math.compile(code);
  try {
    evalFunction.evaluate({ tmp: {} });
    return {
      datapoints: Object.keys(datapoints),
      sequences: Object.keys(sequences),
    };
  } catch (error) {
    return { datapoints: [], sequences: [], error: error.toString() };
  }
};

export interface CalculatorProps {
  datapointId: string;
  name: string;
  code: string;
  valueType: DatapointValueType;
  valueUnit?: DatapointValueUnit;
  source: {
    getDatapoint: (id: string) => {
      point: UniqueDatapoint;
      state: DatapointState;
    };
    getSequence: (id: string) => {
      sequence: DatapointSequence;
      state: SequenceState;
    };
  };
}
export class Calculator {
  constructor(props: CalculatorProps) {
    const { code, datapointId, valueType, valueUnit, name } = props;
    this.datapointId = datapointId;
    this.calculatedDatapoint = {
      id: this.datapointId,
      name,
      valueType,
      valueUnit,
    };
    this.code = code;
    const getValue = (key: string) => {
      const { point, state } = this.currentSource.getDatapoint(key) || {};
      return state
        ? point.valueType === "string"
          ? state.valueString
          : state.valueNum
        : undefined;
    };
    const seqDuration = (sequenceId: string, resultUnit: string) => {
      if (!isDurationUnit(resultUnit)) {
        throw new Error(
          `The function seqDuration needs a duration unit as second param: Use one of: ${Object.keys(
            DurationUnits
          ).join(", ")}`
        );
      }
      const { sequence, state } =
        this.currentSource.getSequence(sequenceId) || {};
      if (!sequence) {
        throw new Error(
          `The sequence with id ${sequenceId} is not available in the context.`
        );
      }
      return getSequenceDuration(sequence, state, resultUnit);
    };
    const seqFind = (
      which: string,
      sequenceId: string,
      value: number | string,
      aspect: string
    ) => {
      if (which !== "first" && which !== "last") {
        throw new Error(
          `The function seqFind needs a selector as first param. Use one of: "first", "last".`
        );
      }
      if (aspect !== "at" && aspect !== "value") {
        throw new Error(
          `The function seqFind needs an aspect as third param. Use one of: "at", "value".`
        );
      }
      const { sequence, state } =
        this.currentSource.getSequence(sequenceId) || {};
      if (!sequence) {
        throw new Error(
          `The sequence with id ${sequenceId} is not available in the context.`
        );
      }
      return getSequenceFind(which, sequence, state, value, aspect);
    };
    const seqIntegral = (sequenceId: string, timeUnit: string) => {
      if (!isDurationUnit(timeUnit)) {
        throw new Error(
          `The function seqIntegral needs a duration unit as second param: Use one of: ${Object.keys(
            DurationUnits
          ).join(", ")}`
        );
      }
      const { sequence, state } =
        this.currentSource.getSequence(sequenceId) || {};
      if (!sequence) {
        throw new Error(
          `The sequence with id ${sequenceId} is not available in the context.`
        );
      }
      const { point } = sequence;
      if (point.valueType === "string") {
        throw new Error(
          `The seqIntegral function can not be computed on string values (sequence id: ${sequenceId}). Choose a different sequence.`
        );
      }
      return getSequenceIntegral(sequence, state, timeUnit);
    };

    const math = extendMath({
      isDef: function (...value: unknown[]) {
        return isDefined(...value);
      },
      get: function (key: string) {
        return getValue(key);
      },
      seqDuration: function (sequenceId: string, valueUnit: string) {
        return seqDuration(sequenceId, valueUnit);
      },
      seqFind: function (
        which: string,
        sequenceId: string,
        value: string | number,
        aspect: string
      ) {
        return seqFind(which, sequenceId, value, aspect);
      },
      seqIntegral: function (sequenceId: string, timeUnit: string) {
        return seqIntegral(sequenceId, timeUnit);
      },
      valueForRange: function (
        value: number,
        limits: Matrix,
        values: Matrix,
        ifNone: AnyDataValue
      ) {
        return getValueForMathJsRange(value, limits, values, ifNone);
      },
    });
    if (!math.compile) {
      throw new Error(
        `Fatal error (math.compile is undefined): Unable to create Calculator.`
      );
    }
    this.evalFunction = math.compile(code);
  }
  private datapointId: string;
  private calculatedDatapoint: Datapoint;
  private code: string;
  private currentSource: {
    getDatapoint: CalculatorProps["source"]["getDatapoint"];
    getSequence: CalculatorProps["source"]["getSequence"];
    tmp: Record<string, unknown>;
  };
  private evalFunction: math.EvalFunction;
  private getStateValueFor = (
    calculated: unknown
  ): { valueNum?: number; valueString?: string; error?: string } => {
    if (!isDefined(calculated)) {
      return {};
    }
    if (this.calculatedDatapoint.valueType === "number") {
      return typeof calculated === "number"
        ? { valueNum: calculated }
        : {
            error: `The specified value type is ${
              this.calculatedDatapoint.valueType
            }, but the type of the calculated result is ${typeof calculated}.`,
          };
    } else if (this.calculatedDatapoint.valueType === "string") {
      return typeof calculated === "string"
        ? { valueString: calculated }
        : {
            error: `The specified value type is ${
              this.calculatedDatapoint.valueType
            }, but the type of the calculated result is ${typeof calculated}.`,
          };
    } else if (this.calculatedDatapoint.valueType === "boolean") {
      if (typeof calculated === "string") {
        return {
          valueString: calculated,
          valueNum: calculated === "true" ? 1 : 0,
        };
      } else if (typeof calculated === "number") {
        return {
          valueString: calculated === 1 ? "true" : "false",
          valueNum: calculated,
        };
      } else if (typeof calculated === "boolean") {
        return {
          valueString: calculated === true ? "true" : "false",
          valueNum: calculated === true ? 1 : 0,
        };
      } else {
        return {
          error: `The specified value type is ${
            this.calculatedDatapoint.valueType
          }, but the type of the calculated result is ${typeof calculated}.`,
        };
      }
    } else if (this.calculatedDatapoint.valueType === "date") {
      return typeof calculated === "number"
        ? {
            valueNum: calculated,
            valueString: DateTime.fromMillis(calculated).toFormat(
              "yyyy-LL-dd HH:mm:ss"
            ),
          }
        : {
            error: `The specified value type is ${
              this.calculatedDatapoint.valueType
            }, but the type of the calculated result is ${typeof calculated}.`,
          };
    }
  };

  public calculate = (): {
    valueNum?: number;
    valueString?: string;
    error?: string;
  } => {
    try {
      const anyResult = this.evalFunction.evaluate(this.currentSource);
      let result: AnyDataValue = undefined;
      if (isResultSet(anyResult)) {
        try {
          const resultArr: AnyDataValue[] = anyResult.valueOf();
          result = resultArr.length
            ? resultArr[resultArr.length - 1]
            : undefined;
        } catch (error) {
          console.error(`Unexpected result of evaluating math node: ${result}`);
        }
      } else {
        result = anyResult;
      }
      const { valueNum, valueString, error } = this.getStateValueFor(result);
      if (!error) {
        return { valueNum, valueString };
      } else {
        return {
          error,
        };
      }
    } catch (error) {
      return {
        error: `Catched error in calculator. id: ${this.datapointId}, code: ${
          this.code
        }, error: ${error.toString()}`,
      };
    }
  };
}
