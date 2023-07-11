/* eslint-disable import/no-anonymous-default-export */
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";

export default {
  //input: "src/service-worker.js",
  input: "src/sw.js",
  output: {
    file: "public/sw.js",
    // format: "esm",
    format: "iife",
  },
  // plugins: [
  //   typescript({
  //     compilerOptions: {
  //       lib: ["es2016", "WebWorker", "dom"],
  //       target: "es2016",
  //       module: "esnext",
  //     },
  //   }),
  //   nodeResolve(),
  //   babel({ babelHelpers: "bundled" }),
  // ],
  plugins: [
    babel({
      babelHelpers: "bundled",
      presets: ["@babel/preset-env", "@babel/preset-typescript"],
      extensions: [".js", ".ts"],
    }),
    typescript({
      compilerOptions: {
        lib: ["es2016", "WebWorker", "dom"],
        target: "es2016",
        module: "esnext",
      },
    }),
    nodeResolve({ jsnext: true, preferBuiltins: true, browser: true }),
    commonjs({
      include: /node_modules/,
      requireReturnsDefault: "auto",
    }),
  ],
};
