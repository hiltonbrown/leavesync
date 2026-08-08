import { execSync } from "node:child_process";

try {
  const commitMessage = execSync("git log -1 --pretty=%B", {
    encoding: "utf8",
  }).trim();

  const skipKeywords = [
    "[skip ci]",
    "[ci skip]",
    "[skip vercel]",
    "[vercel skip]",
    "[no ci]",
  ];

  const shouldSkip = skipKeywords.some((keyword) =>
    commitMessage.toLowerCase().includes(keyword.toLowerCase())
  );

  if (shouldSkip) {
    console.log("Skipping Vercel build due to commit message skip directive.");
    process.exit(0);
  }
} catch {
  // If git command fails (e.g. shallow clone without history), proceed with build
  console.warn("Unable to inspect git commit message, proceeding with build.");
}

process.exit(1);
