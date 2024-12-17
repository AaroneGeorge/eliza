const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Print passed arguments
console.log("Passing arguments:", process.argv.slice(2));

// Base packages directory
const PACKAGES_DIR = "./packages";

// Display help message
console.log(`
***********************************************************************
*                                                                     *
* IMPORTANT NOTICE:                                                  *
*                                                                     *
* To add your plugin to the development workflow:                    *
*                                                                     *
*  1. Navigate to the 'scripts' directory in your project.           *
*                                                                     *
*        cd scripts                                                  *
*                                                                     *
*  2. Edit the 'dev.js' script file.                                 *
*                                                                     *
*        Edit dev.js                                                 *
*                                                                     *
*  3. Add the following changes:                                     *
*                                                                     *
*     a. Ensure your plugin's package.json contains a 'dev' command  *
*        under the "scripts" section. Example:                       *
*                                                                     *
*        "scripts": {                                                *
*            "dev": "your-dev-command-here"                          *
*        }                                                           *
*                                                                     *
*     b. Add your plugin's folder name to the WORKING_FOLDERS list   *
*        (relative to ./packages).                                   *
*                                                                     *
*        Example: WORKING_FOLDERS=["client-direct", "your-plugin-folder"] *
*                                                                     *
*  4. Update the 'agent/package.json' file:                          *
*                                                                     *
*     Add your plugin to the "dependencies" section like so:         *
*                                                                     *
*        "@ai16z/your-plugin-name": "workspace:*"                    *
*                                                                     *
*  5. Edit the 'index.ts' file in 'agent/src':                       *
*                                                                     *
*     a. Import your plugin:                                         *
*                                                                     *
*        import yourPlugin from '@ai16z/your-plugin-name';           *
*                                                                     *
*     b. Add your plugin to the 'plugins' array:                     *
*                                                                     *
*        const plugins = [                                           *
*          existingPlugin,                                           *
*          yourPlugin,                                               *
*        ];                                                          *
*                                                                     *
* This will ensure that your plugin's development server runs        *
* alongside others when you execute this script.                     *
***********************************************************************
`);

// Add delay with dots
(async () => {
    for (let i = 0; i < 5; i++) {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    console.log();
})();

// Check if packages directory exists
if (!fs.existsSync(PACKAGES_DIR)) {
    console.error(`Error: Directory ${PACKAGES_DIR} does not exist.`);
    process.exit(1);
}

// List of working folders to watch
const WORKING_FOLDERS = ["client-direct"]; // Core is handled separately

// Initialize commands array
const commands = [];

// Handle core package
const CORE_PACKAGE = path.join(PACKAGES_DIR, "core");
if (fs.existsSync(CORE_PACKAGE)) {
    commands.push(
        `pnpm --dir ${CORE_PACKAGE} dev -- ${process.argv.slice(2).join(" ")}`
    );
} else {
    console.warn("Warning: 'core' package not found in", PACKAGES_DIR);
}

// Process working folders
for (const folder of WORKING_FOLDERS) {
    const packagePath = path.join(PACKAGES_DIR, folder);
    if (fs.existsSync(packagePath)) {
        commands.push(
            `pnpm --dir ${packagePath} dev -- ${process.argv.slice(2).join(" ")}`
        );
    } else {
        console.warn(
            `Warning: '${folder}' folder not found in ${PACKAGES_DIR}`
        );
    }
}

// Handle client directory
if (fs.existsSync("./client")) {
    commands.push(
        `pnpm --dir client dev -- ${process.argv.slice(2).join(" ")}`
    );
} else {
    console.warn("Warning: 'client' directory not found.");
}

// Handle agent directory
if (fs.existsSync("./agent")) {
    const watchPaths = WORKING_FOLDERS.map(
        (folder) => `--watch './packages/${folder}/dist'`
    );
    commands.push(
        `nodemon ${watchPaths.join(" ")} -e js,json,map --delay 2 --exec 'pnpm --dir agent dev -- ${process.argv.slice(2).join(" ")}'`
    );
} else {
    console.warn("Warning: 'agent' directory not found.");
}

// Run build command first
try {
    execSync("pnpm build", { stdio: "inherit" });
} catch (error) {
    console.error("Build failed. Exiting.");
    process.exit(1);
}

// Run all commands concurrently
if (commands.length > 0) {
    const { default: concurrently } = require("concurrently");

    const { result } = concurrently(
        commands.map((command) => ({
            command,
            prefixColor: "auto",
        })),
        {
            prefix: "name",
            killOthers: ["failure", "success"],
            restartTries: 3,
        }
    );

    result.catch((err) => {
        console.error("Error running commands:", err);
        process.exit(1);
    });
} else {
    console.log("No valid packages to run.");
}
