import { createFileRoute } from "@tanstack/react-router";
import { LaborApp } from "@/components/labor/LaborApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LaborApp />;
}
