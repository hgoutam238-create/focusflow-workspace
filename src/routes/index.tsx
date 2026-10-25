import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/omni/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "OmniFocus Matrix Engine · Deep Focus Workspace" },
    { name: "description", content: "Private offline productivity workspace with focus timers, activity tracking, tasks, notes, calendar and analytics." },
    { property: "og:title", content: "OmniFocus Matrix Engine" },
    { property: "og:description", content: "Your private deep-focus workspace: seven persistent dashboards, entirely on your device." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Workspace,
});
