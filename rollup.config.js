import eslint from "@rbnlffl/rollup-plugin-eslint";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import multiInput from "rollup-plugin-multi-input";
import nodePolyfills from "rollup-plugin-node-polyfills";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

export default {
  input: ["src/calculation/**/*.*", "src/functions/**/*.*"],
  output: [
    {
      dir: pkg.main,
      format: "es",
      exports: "named",
      sourcemap: true,
    },
  ],
  plugins: [
    multiInput({ relative: "src/" }),
    json(),
    peerDepsExternal(),
    commonjs({
      include: ["node_modules/**"],
    }),
    nodeResolve({ preferBuiltins: false }),
    nodePolyfills(),
    babel(),
    eslint(
      {},
      {
        exclude: ["node_modules", "./node_modules/**"],
      }
    ),
    typescript({ tsconfig: "./tsconfig.json" }),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
  ],
};
