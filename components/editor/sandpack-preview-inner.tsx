"use client";

import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
} from "@codesandbox/sandpack-react";
import type { ProjectFile } from "@/types/project";

interface SandpackPreviewInnerProps {
  files: ProjectFile[];
  isMobile?: boolean;
}

function toSandpackFiles(
  files: ProjectFile[]
): Record<string, { code: string; active?: boolean }> {
  const result: Record<string, { code: string; active?: boolean }> = {};
  for (const file of files) {
    const path = file.path.startsWith("/") ? file.path : `/${file.path}`;
    result[path] = { code: file.content };
  }
  return result;
}

function getEntryFile(files: ProjectFile[]): string {
  const candidates = [
    "src/index.tsx",
    "src/index.ts",
    "src/main.tsx",
    "src/main.ts",
    "index.tsx",
    "index.ts",
  ];
  for (const c of candidates) {
    if (files.some((f) => f.path === c)) {
      return `/${c}`;
    }
  }
  return "/src/index.tsx";
}

function getDependencies(files: ProjectFile[]): Record<string, string> {
  const pkgFile = files.find((f) => f.path === "package.json");
  if (!pkgFile) return {};
  try {
    const pkg = JSON.parse(pkgFile.content);
    return pkg.dependencies || {};
  } catch {
    return {};
  }
}

export function SandpackPreviewInner({
  files,
  isMobile,
}: SandpackPreviewInnerProps) {
  const sandpackFiles = toSandpackFiles(files);
  const entryFile = getEntryFile(files);
  const deps = getDependencies(files);

  // Ensure required base files exist
  if (!sandpackFiles["/src/index.css"]) {
    sandpackFiles["/src/index.css"] = {
      code: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    };
  }

  return (
    <SandpackProvider
      template="react-ts"
      files={sandpackFiles}
      customSetup={{
        entry: entryFile,
        dependencies: {
          "react": "^18.0.0",
          "react-dom": "^18.0.0",
          ...deps,
        },
      }}
      options={{
        externalResources: ["https://cdn.tailwindcss.com"],
        recompileMode: "delayed",
        recompileDelay: 500,
      }}
      theme="dark"
    >
      <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
        <SandpackPreview
          showNavigator
          showRefreshButton
          style={{
            height: "100%",
            maxWidth: isMobile ? "375px" : "100%",
            margin: isMobile ? "0 auto" : "0",
          }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}
