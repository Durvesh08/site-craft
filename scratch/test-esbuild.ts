import { transform } from "esbuild";

async function run() {
  const code = `
    function HeroSection() {
      return <div><i data-lucide="sparkles"></i> Hello world</div>
    }
  `;

  try {
    const res = await transform(code, {
      loader: "tsx",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      target: "es2020",
    });
    console.log("SUCCESS");
    console.log(res.code);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }
}

run();
