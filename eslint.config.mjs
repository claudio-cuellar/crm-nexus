
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Enforce architectural boundaries between domain modules.
  {
    files: ["src/modules/**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/modules/identity",
              from: "./src/modules",
              except: ["./identity"],
            },
            {
              target: "./src/modules/tenant",
              from: "./src/modules",
              except: ["./tenant", "./identity"],
            },
            {
              target: "./src/modules/authz",
              from: "./src/modules",
              except: ["./authz", "./tenant", "./identity"],
            },
            {
              target: "./src/modules/projects",
              from: "./src/modules",
              except: [
                "./projects",
                "./authz",
                "./tenant",
                "./identity",
                "./audit",
              ],
            },
            {
              target: "./src/modules/crm",
              from: "./src/modules",
              except: [
                "./crm",
                "./authz",
                "./tenant",
                "./identity",
                "./projects",
                "./audit",
              ],
            },
            {
              target: "./src/modules/branding",
              from: "./src/modules",
              except: [
                "./branding",
                "./tenant",
                "./identity",
                "./audit",
              ],
            },
            {
              target: "./src/modules/audit",
              from: "./src/modules",
              except: ["./audit"],
            },
            {
              target: "./src/modules/apidocs",
              from: "./src/modules",
              except: ["./apidocs"],
            },

            // Shared must never depend on domain modules.
            {
              target: "./src/shared",
              from: "./src/modules",
            },
            {
              target: "./src/modules",
              from: "./src/app",
              message: "Domain modules cannot import from the application layer.",
            },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
