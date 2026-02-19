import { getToolMetadata, ToolPage } from "@/app/lib/tool-page";
import type { ToolPath } from "@/app/tools-config";

const PATH: ToolPath = "extract-text-from-pdf";

export async function generateMetadata() {
  return getToolMetadata(PATH);
}

export default function Page() {
  return <ToolPage path={PATH} />;
}
