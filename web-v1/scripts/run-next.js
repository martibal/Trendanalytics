/* scripts/run-next.js
   Ensures Next runs from a canonical (realpath) cwd to avoid Windows path-casing duplicates.
*/
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const projectRoot = fs.realpathSync.native(path.join(__dirname, ".."));
process.chdir(projectRoot);

const args = process.argv.slice(2);
const isWin = process.platform === "win32";
const npxCmd = isWin ? "npx.cmd" : "npx";

const env = { ...process.env, PWD: projectRoot };

const result = cp.spawnSync(npxCmd, ["next", ...args], {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
