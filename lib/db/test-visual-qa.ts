import { performVisualQa } from '../../artifacts/api-server/src/lib/visualQa.js';

async function run() {
  console.log("Testing Visual QA check on invalid HTML...");

  // Case 1: HTML with duplicate IDs and nested anchors
  const invalidHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Test Site</title>
    </head>
    <body>
      <div id="section-1">
        <!-- Duplicate ID -->
        <button id="cta-button">Click me</button>
      </div>
      <div id="section-2">
        <!-- Duplicate ID -->
        <button id="cta-button">Click me too</button>
        
        <!-- Invalid nesting: anchor inside anchor -->
        <a href="/outer">
          Outer Link
          <a href="/inner">Inner Link</a>
        </a>
      </div>
    </body>
    </html>
  `;

  const res1 = performVisualQa(invalidHtml);
  console.log("Validation Result:", res1);

  if (res1.valid) {
    throw new Error("Expected invalidHtml to fail Visual QA, but it passed!");
  }

  const hasDuplicateIdError = res1.errors.some(e => e.includes("Duplicate ID attribute 'cta-button'"));
  const hasNestedAnchorError = res1.errors.some(e => e.includes("Anchor tag <a> cannot be placed inside another <a>"));

  if (!hasDuplicateIdError) {
    throw new Error("Expected to find duplicate ID error in report!");
  }
  if (!hasNestedAnchorError) {
    throw new Error("Expected to find nested anchor error in report!");
  }

  // Case 2: Clean, valid HTML
  const validHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Valid Site</title>
    </head>
    <body>
      <div id="section-1">
        <button id="cta-button-1">Click me</button>
      </div>
      <div id="section-2">
        <button id="cta-button-2">Click me too</button>
        <a href="/outer">Outer Link</a>
        <a href="/inner">Inner Link</a>
      </div>
    </body>
    </html>
  `;

  const res2 = performVisualQa(validHtml);
  console.log("Valid HTML Validation Result:", res2);
  if (!res2.valid) {
    throw new Error("Expected validHtml to pass Visual QA, but it failed!");
  }

  console.log("SUCCESS: Headless Visual QA gate verified successfully!");
  process.exit(0);
}

run();
