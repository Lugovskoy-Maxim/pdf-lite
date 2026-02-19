import { getToolMetadata, ToolPage } from "@/app/lib/tool-page";
import type { ToolPath } from "@/app/tools-config";

const PATH: ToolPath = "sign-pdf";

export async function generateMetadata() {
  return getToolMetadata(PATH);
}

export default function Page() {
  return <ToolPage path={PATH} />;
}
