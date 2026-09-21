// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            "args",
            "attach",
            "depthWrite",
            "intensity",
            "metalness",
            "position",
            "rotation",
            "roughness",
            "scale",
            "side",
            "transparent",
          ],
        },
      ],
    },
  },
]);

