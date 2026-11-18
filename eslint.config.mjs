import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Mono rule: never hand-roll form controls outside components/ui.
  // Every visible control renders a shadcn primitive adapted with cn().
  {
    files: ["app/**/*.tsx", "components/**/*.tsx", "features/**/*.tsx"],
    ignores: ["components/ui/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='input'], JSXOpeningElement[name.name='textarea'], JSXOpeningElement[name.name='select'], JSXOpeningElement[name.name='button']",
          message:
            "Do not hand-roll form controls. Import the shadcn primitive from @/components/ui (Input, Textarea, Select, Button) and style it via cn(). Hidden <input type=\"file\"> uploads are the one allowed exception.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored WASM bundles (Emscripten-generated, not our code):
    "public/mediapipe/**",
  ]),
]);

export default eslintConfig;
