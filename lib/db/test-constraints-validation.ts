import { validateSectionConstraints } from '../../artifacts/api-server/src/ai/orchestrator.js';
import { getArchetypeForIndustry } from '../../artifacts/api-server/src/ai/designArchetypes.js';

async function run() {
  const saasTechArchetype = getArchetypeForIndustry("saas");
  const saasFriendlyArchetype = getArchetypeForIndustry("consumer-apps");

  console.log("Testing saas-technical archetype constraints...");
  
  // Case 1: Valid
  const validCode = `
    <div style="font-family: 'Inter', sans-serif;">
      <h1>Welcome</h1>
      <Scene3D type="grid-plane" />
    </div>
  `;
  const val1 = validateSectionConstraints(validCode, saasTechArchetype);
  console.log("Valid Code Validation:", val1);
  if (!val1.valid) {
    throw new Error("Expected validCode to be valid!");
  }

  // Case 2: Invalid 3D scene type
  const invalidSceneCode = `
    <div>
      <Scene3D type="aurora-mesh" />
    </div>
  `;
  const val2 = validateSectionConstraints(invalidSceneCode, saasTechArchetype);
  console.log("Invalid Scene Code Validation:", val2);
  if (val2.valid) {
    throw new Error("Expected invalidSceneCode to fail!");
  }
  if (!val2.errors.some(e => e.includes("3D Scene type 'aurora-mesh' is not allowed"))) {
    throw new Error("Expected 3D scene type error!");
  }

  // Case 3: Invalid Font family style
  const invalidFontCode = `
    <div style="font-family: 'Comic Sans MS', cursive;">
      <p>Hello world</p>
    </div>
  `;
  const val3 = validateSectionConstraints(invalidFontCode, saasFriendlyArchetype);
  console.log("Invalid Font Code Validation:", val3);
  if (val3.valid) {
    throw new Error("Expected invalidFontCode to fail!");
  }
  if (!val3.errors.some(e => e.includes("Font 'Comic Sans MS' is not vetted"))) {
    throw new Error("Expected font error!");
  }

  console.log("SUCCESS: Design archetype constraints validator verified successfully!");
  process.exit(0);
}

run();
