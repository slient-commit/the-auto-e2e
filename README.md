# the-auto-e2e

A YAML-driven end-to-end testing framework powered by Playwright. Install it via npm, configure with a single YAML file, run the same tests across multiple browsers.

**Node.js >= 18** | **Playwright** | **Visual Regression** | **Multi-Browser** | **CommonJS** | **Cross-Platform**

---

## Quick Start

### 1. Install

```bash
npm install -D the-auto-e2e
```

### 2. Initialize

```bash
npx the-auto-e2e init
```

This will:
- Install Playwright Chromium browser
- Generate a starter `auto-e2e.yml` in your project root

To install additional browsers, pass them as arguments:

```bash
npx the-auto-e2e init chromium firefox webkit
```

### 3. Edit `auto-e2e.yml` to match your app

```yaml
app:
  command: "npm run dev"
  url: "http://localhost:4200"

tests:
  - name: "Homepage loads"
    path: "/"
    assertions:
      - type: element-exists
        selector: "h1"
```

### 4. Run

```bash
npx the-auto-e2e
```

> **What happens:** The tool starts your dev server, waits for it to be ready, then for each browser in the `browsers` list it opens a headless instance, navigates to each test path, executes actions, evaluates assertions, and prints results. The server is automatically killed when done.

### Execution Flow

```
Load YAML → Start Server → Poll URL → For each browser → Launch & Run Tests → Write Report → Kill Server
```

---

## Project Structure

```
the-auto-e2e/
  package.json
  index.js                      ← CLI entry point (subcommand routing)
  auto-e2e.sample.yml           ← example config
  commands/
    init.js                     ← `the-auto-e2e init` subcommand
  src/
    config-loader.js            ← parse YAML, validate, apply defaults
    schema.js                   ← validation rules
    server-manager.js           ← start/stop dev server
    test-runner.js              ← orchestrate Playwright
    action-executor.js          ← click, type, hover…
    assertion-engine.js         ← element-exists, text-contains…
    visual-comparator.js        ← screenshot & pixelmatch
    reporter.js                 ← console output & JSON report
    utils.js                    ← helpers (delay, pollUrl, ensureDir)
  tests/
    schema.test.js              ← config validation tests
    config-loader.test.js       ← defaults & normalization tests
    action-executor.test.js     ← action delegation tests
    assertion-engine.test.js    ← assertion evaluation tests
    reporter.test.js            ← JSON report tests
    utils.test.js               ← utility function tests
    init.test.js                ← init command tests
```

---

## YAML Configuration

The configuration file has four top-level sections:

| Section | Required | Description |
|---|---|---|
| `app` | **required** | Dev server command, URL, browser settings |
| `visualDefaults` | optional | Screenshot directories, comparison thresholds |
| `tests` | optional* | Functional test cases with actions & assertions |
| `visualTests` | optional* | Visual regression test cases |

> **Note:** At least one of `tests` or `visualTests` must be defined. You can use both, but the config is invalid if neither exists.

---

## App Configuration

```yaml
app:
  command: "npm run dev"           # command to start the dev server
  url: "http://localhost:4200"     # base URL to wait for
  startTimeout: 30000              # max ms to wait for server
  browsers:                        # list of browsers to test in
    - "chromium"
    - "firefox"
  headless: true                   # run browsers headlessly
  viewport:
    width: 1280
    height: 720
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `command` | string | **required** | — | Shell command to start the dev server |
| `url` | string | **required** | — | Base URL (must start with `http://` or `https://`) |
| `startTimeout` | number | optional | `30000` | Maximum milliseconds to wait for the server |
| `browsers` | string[] | optional | `["chromium"]` | List of browser engines to run tests in. Values: `chromium`, `firefox`, `webkit` |
| `browser` | string | optional | — | Shorthand for a single browser (converted to `browsers: [value]` internally) |
| `headless` | boolean | optional | `true` | Run in headless mode |
| `viewport.width` | number | optional | `1280` | Browser viewport width in pixels |
| `viewport.height` | number | optional | `720` | Browser viewport height in pixels |

### Multi-Browser Testing

When multiple browsers are specified, the entire test suite runs sequentially in each browser. Results are aggregated into a single report with a `browser` field on each test result.

**Single browser (default):**

```yaml
app:
  browsers:
    - "chromium"
```

**All three browsers:**

```yaml
app:
  browsers:
    - "chromium"
    - "firefox"
    - "webkit"
```

> **Backward compatibility:** The old `browser: "firefox"` (single string) syntax still works. It is automatically converted to `browsers: ["firefox"]`.

> **Visual regression & multi-browser:** Each browser uses its own subdirectory for screenshots: `baseline/chromium/`, `baseline/firefox/`, etc. This prevents false diffs caused by rendering differences between engines.

---

## Visual Defaults

```yaml
visualDefaults:
  baselineDir: "./screenshots/baseline"   # baseline PNGs
  diffDir: "./screenshots/diff"           # diff PNGs on failure
  currentDir: "./screenshots/current"     # current run PNGs
  threshold: 0.1                          # pixelmatch color threshold 0-1
  failOnMissingBaseline: false            # false = auto-create baseline
```

| Field | Type | Default | Description |
|---|---|---|---|
| `baselineDir` | string | `./screenshots/baseline` | Directory for baseline PNG files |
| `diffDir` | string | `./screenshots/diff` | Directory where diff images are saved on failure |
| `currentDir` | string | `./screenshots/current` | Directory for current run screenshots |
| `threshold` | number | `0.1` | Pixelmatch color sensitivity (0 = exact, 1 = lenient) |
| `failOnMissingBaseline` | boolean | `false` | If `false`, auto-creates baseline on first run. If `true`, test fails when baseline is missing. |

> **Path resolution:** All paths are resolved relative to the YAML config file location, not the working directory.

---

## CLI Usage

```bash
npx the-auto-e2e [command] [options]
```

### Commands

| Command | Description |
|---|---|
| `run` (default) | Run the E2E test suite |
| `init [browsers...]` | Generate starter config and install Playwright browsers |

### Options (for `run`)

| Flag | Default | Description |
|---|---|---|
| `--config <path>` | `auto-e2e.yml` | Path to the YAML configuration file |
| `--output <path>` | `auto-e2e-results.json` | Path for the JSON results report |

### Examples

```bash
# Run tests with defaults
npx the-auto-e2e

# Explicit run subcommand
npx the-auto-e2e run

# Custom config file
npx the-auto-e2e --config tests/e2e-config.yml

# Custom config and output path
npx the-auto-e2e run --config ci.yml --output reports/e2e.json

# Initialize with default browser (chromium)
npx the-auto-e2e init

# Initialize with multiple browsers
npx the-auto-e2e init chromium firefox webkit
```

---

## Functional Tests

Functional tests navigate to a page, perform actions, and verify assertions.

```yaml
tests:
  - name: "Login flow"            # human-readable test name
    path: "/login"                # appended to app.url
    actions:                       # optional sequence of actions
      - action: type
        selector: "#email"
        value: "user@example.com"
      - action: click
        selector: "button[type='submit']"
      - action: wait-for-navigation
    assertions:                    # required, at least one
      - type: url-matches
        expected: "/dashboard"
      - type: text-contains
        selector: ".welcome"
        expected: "Hello"
```

| Field | Required | Description |
|---|---|---|
| `name` | **required** | Descriptive name shown in output |
| `path` | **required** | URL path appended to `app.url` |
| `actions` | optional | Sequence of browser actions to perform |
| `assertions` | **required*** | Non-empty array of assertions to evaluate |
| `steps` | optional* | Array of sequential step blocks (see [Multi-Step Tests](#multi-step-tests)) |

> **\*steps vs assertions:** A test must have **either** `assertions` (standard test) **or** `steps` (multi-step test) — not both. When using `steps`, top-level `actions` and `assertions` are not allowed.

> **Behavior on failure:** If an **action** fails, remaining actions and all assertions are skipped — the test is marked failed immediately. If an **assertion** fails, remaining assertions still run to give a full picture.

---

## Multi-Step Tests

Multi-step tests run multiple blocks of actions and assertions on the **same browser page**, preserving session state (cookies, tokens, localStorage) between steps. This is ideal for flows that depend on authentication or sequential state changes.

Use `steps` instead of top-level `actions` and `assertions`:

```yaml
tests:
  - name: "Login and submit a form"
    path: "/login"
    steps:
      - name: "Login"
        actions:
          - action: type
            selector: "#email"
            value: "user@example.com"
          - action: type
            selector: "#password"
            value: "secret123"
          - action: click
            selector: "button[type='submit']"
          - action: wait-for-navigation
        assertions:
          - type: url-matches
            expected: "/dashboard"
          - type: element-exists
            selector: ".dashboard-container"

      - name: "Open the new-item form"
        actions:
          - action: click
            selector: "#new-item-btn"
          - action: wait-for-selector
            selector: "#item-form"
        assertions:
          - type: element-visible
            selector: "#item-form"

      - name: "Fill and submit the form"
        actions:
          - action: type
            selector: "#item-name"
            value: "My new item"
          - action: click
            selector: "#item-form button[type='submit']"
          - action: wait-for-selector
            selector: ".success-toast"
        assertions:
          - type: element-exists
            selector: ".success-toast"
          - type: text-contains
            selector: ".success-toast"
            expected: "Item created"
```

### Step Fields

| Field | Required | Description |
|---|---|---|
| `name` | **required** | Descriptive name for the step, shown in output |
| `actions` | optional | Sequence of browser actions to perform |
| `assertions` | **required** | Non-empty array of assertions to evaluate |

### Rules

- A test must use **either** `steps` **or** top-level `actions`/`assertions` — not both.
- Each step requires a `name` and at least one `assertions` entry.
- Steps use the same actions and assertions as standard tests.

> **Behavior on failure:** If any step fails (action error or assertion failure), remaining steps are skipped and the entire test is marked as failed. This prevents cascading errors when an early step like login doesn't succeed.

### JSON Report for Multi-Step Tests

Multi-step test results include a `steps` array instead of a top-level `assertions` array:

```json
{
  "name": "Login and submit a form",
  "type": "functional",
  "browser": "chromium",
  "path": "/login",
  "status": "passed",
  "durationMs": 4567,
  "steps": [
    {
      "name": "Login",
      "status": "passed",
      "assertions": [
        { "status": "passed", "message": "url-matches: /dashboard" }
      ],
      "error": null
    },
    {
      "name": "Fill and submit the form",
      "status": "passed",
      "assertions": [
        { "status": "passed", "message": "element-exists: .success-toast" }
      ],
      "error": null
    }
  ],
  "error": null
}
```

---

## Actions Reference

Actions are executed in order before assertions. Each action maps to a Playwright API call.

### `click`

Clicks the first element matching the selector.

```yaml
- action: click
  selector: "#submit-btn"       # required
```

### `type`

Clears the field and fills it with the given text.

```yaml
- action: type
  selector: "#email"            # required
  value: "user@example.com"    # required
```

### `hover`

Hovers over the matching element.

```yaml
- action: hover
  selector: ".tooltip-trigger"  # required
```

### `select`

Selects an option in a `<select>` element.

```yaml
- action: select
  selector: "#language"          # required
  value: "fr"                  # required
```

### `scroll`

Scrolls the matching element into view.

```yaml
- action: scroll
  selector: "footer"            # required
```

### `wait`

Pauses execution for a fixed duration.

```yaml
- action: wait
  timeout: 1000                # required, in ms
```

### `wait-for-selector`

Waits until an element appears in the DOM.

```yaml
- action: wait-for-selector
  selector: ".content-loaded"   # required
  timeout: 5000                # optional, default 5000ms
```

### `wait-for-navigation`

Waits for the page to finish loading (network idle).

```yaml
- action: wait-for-navigation
```

### `press`

Presses a keyboard key on the focused element.

```yaml
- action: press
  selector: "#search"           # required
  key: "Enter"                # required
```

### `clear`

Clears the content of an input field.

```yaml
- action: clear
  selector: "#search-input"     # required
```

### `goto`

Navigates to a different URL mid-test. Paths starting with `/` are resolved relative to `app.url`. Full URLs (`http://...`) are used as-is.

```yaml
- action: goto
  url: "/items/42/edit"         # required
```

### `capture-text`

Captures the trimmed text content of an element and stores it in a named variable for later use.

```yaml
- action: capture-text
  selector: ".result-id"        # required
  variable: "itemId"            # required
```

### `capture-attribute`

Captures the value of an HTML attribute and stores it in a named variable.

```yaml
- action: capture-attribute
  selector: "a.result-link"     # required
  attribute: "href"             # required
  variable: "resultUrl"         # required
```

### `capture-url`

Extracts a value from the current page URL using a pattern and stores it in a named variable. Supports two pattern styles:

**Regex pattern** (contains parentheses) — extracts the first capture group:

```yaml
- action: capture-url
  pattern: "/items/(\\d+)"      # required
  variable: "itemId"            # required
```

**Named segment pattern** (uses `:name` syntax) — converts to regex internally:

```yaml
- action: capture-url
  pattern: "/items/:itemId"     # required
  variable: "itemId"            # required
```

---

## Variable Interpolation

Actions and assertions support `{{variableName}}` placeholders that are replaced at runtime with values captured earlier in the test. This enables dynamic, data-driven flows.

Variables are captured using `capture-text`, `capture-attribute`, or `capture-url` actions. They can be used in any string field: `selector`, `value`, `url`, `expected`, `attribute`, `key`.

```yaml
tests:
  - name: "Create item and verify details page"
    path: "/items/new"
    steps:
      - name: "Create item"
        actions:
          - action: type
            selector: "#name"
            value: "My Item"
          - action: click
            selector: "#submit"
          - action: wait-for-navigation
          - action: capture-url
            pattern: "/items/:id"
            variable: "id"
        assertions:
          - type: url-matches
            expected: "/items/{{id}}"

      - name: "Verify details page"
        actions:
          - action: goto
            url: "/items/{{id}}/edit"
        assertions:
          - type: element-exists
            selector: "#item-{{id}}"
          - type: text-contains
            selector: ".item-title"
            expected: "My Item"
```

> **Scope:** Variables are shared across all steps in a multi-step test. In standard tests, variables are shared across all actions and assertions within the same test. Each test starts with a fresh, empty variable store.

> **Unknown placeholders:** If a `{{varName}}` references a variable that hasn't been captured yet, it is left as-is in the string (not replaced).

---

## Assertions Reference

Assertions verify the state of the page after actions complete. All assertions in a test are evaluated even if some fail.

### `element-exists`

Passes if the element is present in the DOM.

```yaml
- type: element-exists
  selector: "h1"    # required
```

### `element-not-exists`

Passes if the element is NOT present in the DOM.

```yaml
- type: element-not-exists
  selector: ".error-banner"    # required
```

### `element-visible`

Passes if the element is visible on the page.

```yaml
- type: element-visible
  selector: ".hero-banner"    # required
```

### `text-contains`

Passes if the element's text content includes the expected substring.

```yaml
- type: text-contains
  selector: "h1"              # required
  expected: "Welcome"         # required
```

### `text-equals`

Passes if the element's trimmed text content exactly matches.

```yaml
- type: text-equals
  selector: ".page-title"     # required
  expected: "Dashboard"       # required
```

### `url-matches`

Passes if the current page URL includes the expected string.

```yaml
- type: url-matches
  expected: "/dashboard"      # required
```

### `title-contains`

Passes if the page title includes the expected string.

```yaml
- type: title-contains
  expected: "My App"          # required
```

### `attribute-equals`

Passes if the element's attribute matches the expected value.

```yaml
- type: attribute-equals
  selector: "img.logo"        # required
  attribute: "alt"             # required
  expected: "Company Logo"    # required
```

### `element-count`

Passes if the number of matching elements equals the expected count.

```yaml
- type: element-count
  selector: "ul.nav li"       # required
  expected: 5                 # required, must be a number
```

---

## Visual Regression Tests

Visual tests capture screenshots and compare them against stored baselines using [pixelmatch](https://github.com/mapbox/pixelmatch).

```yaml
visualTests:
  - name: "Homepage visual check"
    path: "/"
    baseline: "homepage.png"      # filename in baselineDir
    actions:                       # optional pre-screenshot actions
      - action: wait
        timeout: 1000
    screenshotOptions:
      fullPage: true
    comparison:
      mode: "threshold"
      maxDiffPercent: 1.5
      threshold: 0.1
```

| Field | Required | Description |
|---|---|---|
| `name` | **required** | Descriptive name for the test |
| `path` | **required** | URL path appended to `app.url` |
| `baseline` | **required** | Filename for the baseline PNG (stored in `baselineDir`) |
| `actions` | optional | Actions to perform before taking the screenshot |
| `screenshotOptions` | optional | Screenshot configuration (see below) |
| `comparison` | optional | Comparison mode and thresholds |

### First Run Behavior

> **Auto-baseline creation:** When `failOnMissingBaseline` is `false` (the default), the first run automatically saves the screenshot as the baseline. Subsequent runs compare against it. Set to `true` in CI if baselines should be pre-committed.

---

## Comparison Modes

### `pixel-perfect`

Zero tolerance. The test fails if *any* pixel differs between the baseline and the current screenshot.

```yaml
comparison:
  mode: "pixel-perfect"
```

### `threshold`

Allows a configurable percentage of pixel differences. Ideal for anti-aliasing and rendering variations.

```yaml
comparison:
  mode: "threshold"
  maxDiffPercent: 1.5
  threshold: 0.1
```

| Field | Default | Description |
|---|---|---|
| `mode` | `threshold` | Comparison strategy |
| `maxDiffPercent` | `1.0` | Maximum allowed percentage of different pixels (threshold mode only) |
| `threshold` | `0.1` | Pixelmatch color sensitivity (0 = exact color match, 1 = very lenient) |

> **Diff images:** When a visual test fails, a diff image highlighting the differences is saved to `diffDir`. Different pixels are shown in red.

---

## Screenshot Options

| Option | Type | Default | Description |
|---|---|---|---|
| `fullPage` | boolean | `false` | Capture the full scrollable page instead of just the viewport |
| `selector` | string | `null` | CSS selector to screenshot a specific element. Overrides `fullPage`. |

### Examples

```yaml
# Viewport screenshot (default)
screenshotOptions: {}

# Full page screenshot
screenshotOptions:
  fullPage: true

# Element screenshot
screenshotOptions:
  selector: ".dashboard-header"
```

---

## Console Output

The tool prints colored output to the terminal during execution:

```
auto-e2e v1.0.0

Starting server: npm run dev
Waiting for http://localhost:4200 ...
Server ready (2.3s)

Running 3 functional tests, 2 visual tests across 2 browsers
Browsers: chromium, firefox

--- chromium ---

  [1/5] Homepage loads correctly
    PASS  element-exists: h1
    PASS  text-contains: h1 -> "Welcome"
    PASSED (1.2s)

  [2/5] Login flow
    PASS  url-matches: /dashboard
    FAIL  text-contains: ".welcome" expected "Hello" but got "Hi"
    FAILED (3.1s)

  [3/5] Login and submit a form
    Step [1/2] Login
    PASS  url-matches: /dashboard
    PASS  element-exists: .dashboard-container
      STEP PASSED
    Step [2/2] Fill and submit the form
    PASS  element-exists: .success-toast
      STEP PASSED
    PASSED (4.6s)

  [4/5] Homepage visual check
    BASELINE CREATED  Baseline created at screenshots/baseline/chromium/homepage.png
    BASELINE CREATED (0.8s)

--- chromium done ---

--- firefox ---

  [1/5] Homepage loads correctly
    PASS  element-exists: h1
    PASS  text-contains: h1 -> "Welcome"
    PASSED (1.4s)

  ...

--- firefox done ---

────────────────────────────────────────
Results: 8 passed, 2 failed, 10 total
Duration: 16.4s
Report saved to auto-e2e-results.json
────────────────────────────────────────
```

---

## JSON Report

A structured JSON file is written after each run (default: `auto-e2e-results.json`).

```json
{
  "startedAt": "2026-02-25T10:30:45.123Z",
  "finishedAt": "2026-02-25T10:30:52.456Z",
  "durationMs": 7333,
  "browsers": ["chromium", "firefox"],
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 2
  },
  "tests": [
    {
      "name": "Homepage loads correctly",
      "type": "functional",
      "browser": "chromium",
      "path": "/",
      "status": "passed",
      "durationMs": 1234,
      "assertions": [
        { "status": "passed", "message": "element-exists: h1" }
      ],
      "error": null
    },
    {
      "name": "Homepage visual check",
      "type": "visual",
      "browser": "chromium",
      "path": "/",
      "status": "passed",
      "durationMs": 890,
      "visual": {
        "status": "passed",
        "diffPixels": 42,
        "diffPercent": 0.05,
        "baselinePath": "/path/to/baseline/chromium/homepage.png",
        "currentPath": "/path/to/current/chromium/homepage.png",
        "diffPath": null,
        "message": "0.05% pixels differ (threshold: 1.5%)"
      },
      "error": null
    }
  ]
}
```

---

## Default Values Reference

| Setting | Default |
|---|---|
| `app.startTimeout` | `30000` ms |
| `app.browsers` | `["chromium"]` |
| `app.headless` | `true` |
| `app.viewport.width` | `1280` px |
| `app.viewport.height` | `720` px |
| `visualDefaults.baselineDir` | `"./screenshots/baseline"` |
| `visualDefaults.diffDir` | `"./screenshots/diff"` |
| `visualDefaults.currentDir` | `"./screenshots/current"` |
| `visualDefaults.threshold` | `0.1` |
| `visualDefaults.failOnMissingBaseline` | `false` |
| `comparison.mode` | `"threshold"` |
| `comparison.maxDiffPercent` | `1.0` % |
| `wait-for-selector` timeout | `5000` ms |
| `--config` CLI flag | `"auto-e2e.yml"` |
| `--output` CLI flag | `"auto-e2e-results.json"` |

---

## Error Handling

### Configuration Errors

| Scenario | Behavior |
|---|---|
| Config file not found | Prints `"Config file not found: <path>"` and exits with code 1 |
| Invalid YAML syntax | Prints `"Invalid YAML: <details>"` and exits with code 1 |
| Schema validation failure | Prints specific error with field path (e.g. `"tests[0].assertions must be a non-empty array"`) and exits with code 1 |

### Server Errors

| Scenario | Behavior |
|---|---|
| Server doesn't start in time | Prints timeout error with the last 20 lines of stderr for diagnostics, kills server, exits with code 1 |
| Server process crashes | Detected by polling timeout, stderr captured in error message |

### Browser Errors

| Scenario | Behavior |
|---|---|
| Browser fails to launch | Prints error with hint: `"Run 'npx playwright install <browser>' to install browser binaries"` |

### Test Errors

| Scenario | Behavior |
|---|---|
| Navigation failure | Test marked as FAILED with error message |
| Action fails (selector not found) | Test marked as FAILED, remaining actions and assertions skipped |
| Assertion fails | Assertion marked as FAILED, remaining assertions still evaluated |
| Baseline image missing | Auto-created (default) or test fails if `failOnMissingBaseline: true` |
| Image dimension mismatch | Test FAILED: `"Dimension mismatch: baseline WxH vs current WxH"` |

> **Server cleanup guarantee:** The dev server process is always killed when the tool exits, even on errors. A `finally` block and `SIGINT`/`SIGTERM` handlers ensure no orphan processes are left behind.

---

## Exit Codes

| Code | Meaning |
|---|---|
| **0** | All tests passed (or baselines were created) |
| **1** | Any test failed, config error, server error, or browser error |

This makes the tool CI/CD-friendly — pipelines will detect failures automatically.

---

## Architecture

The tool is composed of focused modules with clear separation of concerns:

| Module | Responsibility |
|---|---|
| `index.js` | CLI entry point — subcommand routing, test orchestration |
| `commands/init.js` | Init subcommand — installs Playwright browsers, generates starter config |
| `config-loader.js` | Reads YAML, applies defaults, validates schema, resolves paths |
| `schema.js` | Defines and enforces all validation rules for the config |
| `server-manager.js` | Spawns dev server, polls URL, kills process (cross-platform) |
| `test-runner.js` | Loops over each browser, launches instances, iterates tests, collects results |
| `action-executor.js` | Maps YAML action definitions to Playwright API calls |
| `assertion-engine.js` | Evaluates assertions against current page state |
| `visual-comparator.js` | Screenshot capture, baseline management, pixelmatch diffing |
| `reporter.js` | Colored console output and JSON report generation |
| `utils.js` | Shared helpers: delay, URL polling, directory creation |

### Unit Tests

The project includes 118 unit tests covering the critical modules. Run them with:

```bash
npm test
```

Tests use Node.js built-in `node:test` runner — no extra dependencies needed.

### Design Decisions

**CommonJS, not ESM** — All code uses `require()` / `module.exports`. This ensures compatibility when dropped into any project regardless of its module system. Dependencies like `pixelmatch` (pinned to 5.3.0) and `chalk` (^4.x) are specifically chosen for their CJS compatibility.

**Playwright as a library** — The tool uses `playwright` directly, not `@playwright/test`. This gives full control over the browser lifecycle and avoids coupling to Playwright's test runner conventions.

**Cross-platform process management** — On Windows, `taskkill /T /F` kills the entire process tree. On Unix, process groups (`detached: true` + `process.kill(-pid)`) ensure all child processes are terminated.

---

the-auto-e2e v1.0.0 · Powered by Playwright & pixelmatch
