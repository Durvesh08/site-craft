function cleanComponentCode(raw) {
  let code = raw;
  const match = code.match(/```(?:jsx?|tsx?|javascript|typescript)?\s*([\s\S]*?)```/i);
  if (match) {
    code = match[1];
  } else {
    // fallback to old replace if no blocks found
    code = code
      .replace(/^```(?:jsx?|tsx?|javascript|typescript|html|plaintext)?\s*/gim, "")
      .replace(/\s*```\s*$/gim, "");
  }
  return code.trim();
}

const aiOutput = `Here is the requested component.

\`\`\`tsx
function HeroSection() {
  return <div>Hello</div>
}
\`\`\`

Hope you like it!`;

console.log(cleanComponentCode(aiOutput));
