import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import starlightVersions from "starlight-versions";
import starlightLlmsTxt from "starlight-llms-txt";
import tailwindcss from "@tailwindcss/vite";
import { getStarlightVersions, resolveCorePath } from "./scripts/lib/version-discovery.mjs";
import {
  generateExamplesSidebarItems,
  generateSidebarItems,
} from "./scripts/lib/generate-examples-sidebar.mjs";
import starlightGitHubAlerts from "starlight-github-alerts";
import starlightImageZoom from "starlight-image-zoom";

const coreRepoPath = resolveCorePath();
let dynamicVersions;

if (!coreRepoPath) {
  throw new Error(
    "Core repository not found at '.repos/pepr'. Run 'npm run build' first to generate content.",
  );
}

dynamicVersions = await getStarlightVersions(coreRepoPath, 2);

const examplesSidebarItems = generateExamplesSidebarItems();
const userGuideSidebarItems = generateSidebarItems("./src/content/docs/user-guide", "user-guide");
const actionsSidebarItems = generateSidebarItems("./src/content/docs/actions", "actions");
const tutorialsSidebarItems = generateSidebarItems("./src/content/docs/tutorials", "tutorials");
const referenceSidebarItems = generateSidebarItems("./src/content/docs/reference", "reference");
const communitySidebarItems = generateSidebarItems("./src/content/docs/community", "community");
const contributeSidebarItems = generateSidebarItems("./src/content/docs/contribute", "contribute");

// https://astro.build/config
export default defineConfig({
  site: "https://docs.pepr.dev",
  integrations: [
    sitemap(),
    starlight({
      favicon: "/pepr.svg",
      plugins: [
        starlightLlmsTxt(),
        starlightGitHubAlerts(),
        starlightImageZoom(),
        starlightVersions({
          versions: dynamicVersions,
          current: { label: "Latest" },
        }),
      ],
      customCss: ["./src/styles/global.css"],
      disable404Route: true,
      title: "Pepr",
      description: "Pepr Documentation",
      logo: {
        src: "./public/assets/pepr.png",
      },
      components: {
        Head: "./src/components/Head.astro",
        Footer: "./src/components/Footer.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
      head: [
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Aldrich&display=swap",
          },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/defenseunicorns/pepr",
        },
      ],
      sidebar: [
        {
          label: "Start Here",
          slug: "",
        },
        {
          label: "User Guide",
          collapsed: true,
          items: userGuideSidebarItems,
        },
        {
          label: "Actions",
          collapsed: true,
          items: actionsSidebarItems,
        },
        {
          label: "Tutorials",
          collapsed: true,
          items: tutorialsSidebarItems,
        },
        {
          label: "Reference",
          collapsed: true,
          items: referenceSidebarItems,
        },
        {
          label: "Excellent Examples",
          collapsed: true,
          items: examplesSidebarItems,
        },
        {
          label: "Community and Support",
          collapsed: true,
          items: communitySidebarItems,
        },
        {
          label: "Contribute",
          collapsed: true,
          items: contributeSidebarItems,
        },
        {
          label: "Roadmap for Pepr",
          slug: "roadmap",
        },
      ],
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
