declare module "react-file-icon" {
  import { FC } from "react";
  export const FileIcon: FC<{
    extension?: string;
    type?: string;
    color?: string;
    fold?: boolean;
    foldColor?: string;
    glyphColor?: string;
    labelColor?: string;
    labelTextColor?: string;
    labelUppercase?: boolean;
    radius?: number;
    [key: string]: unknown;
  }>;
  export const defaultStyles: Record<string, { type?: string; labelColor?: string; color?: string; [key: string]: unknown }>;
}
