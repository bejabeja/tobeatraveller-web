import { fileURLToPath } from "url";
import path from "path";

const babelrcPath = path.join(path.dirname(fileURLToPath(import.meta.url)), ".babelrc");

export default {
    testEnvironment: "jest-environment-jsdom",
    // The default 5 s is not enough for the heavy pages (settings, passport) when the whole suite runs at once.
    testTimeout: 15000,
    // Running every file at once starved the heavy pages of CPU: half the cores keep the whole suite steady.
    maxWorkers: "50%",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    moduleNameMapper: {
        "\\.(gif|ttf|eot|svg|png)$": "<rootDir>/test/__mocks__/fileMock.js",
        "\\.(css|less|sass|scss)$": "identity-obj-proxy",
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    // @tobeatraveller/shared is a workspace package published as ESM source (no build
    // step), so it needs Babel transformation like our own code instead of being skipped
    // like a normal pre-built node_modules dependency. Its files live outside this
    // package's directory tree, where .babelrc doesn't apply on its own, so the config
    // file is passed explicitly instead of relying on per-directory discovery.
    transformIgnorePatterns: ["/node_modules/(?!@tobeatraveller/shared)"],
    transform: {
        "^.+\\.(js|jsx)$": ["babel-jest", { configFile: babelrcPath }],
    },
};