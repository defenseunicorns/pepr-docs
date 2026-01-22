// Generate Starlight front matter for a file
export const generateFrontMatter = (content, newfile, version, originalFile = "") => {
  const heading = content.match(/#[\s]+(.*)/);

  if (!heading) {
    throw new Error(`Missing heading in ${newfile}. All markdown files must start with # Heading`);
  }

  const isReadme =
    originalFile.endsWith("README.md") || newfile.endsWith("/README.md") || newfile === "README.md";
  const title = isReadme ? "Overview" : heading[1].replaceAll(/[`:]/g, "");

  const slug =
    version !== "latest"
      ? `\nslug: ${version.replace(/^v(\d+\.\d+)\.\d+$/, "v$1")}${
          newfile
            .replace(/\.md$/, "")
            .replace(/\/index$/, "")
            .replace(/^\/+|\/+$/g, "")
            ? `/${newfile
                .replace(/\.md$/, "")
                .replace(/\/index$/, "")
                .replace(/^\/+|\/+$/g, "")}`
            : ""
        }`
      : "";

  const sidebarLabel = isReadme ? "\nsidebar:\n  label: Overview" : "";

  return {
    front: `---\ntitle: ${title}\ndescription: ${title}${slug}${sidebarLabel}\n---`,
    contentWithoutHeading: content.replaceAll(heading[0], ""),
  };
};
