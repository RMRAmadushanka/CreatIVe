/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "lucide-react/dist/esm/DynamicIcon.js" {
  import type { ForwardRefExoticComponent, ReactNode, RefAttributes, SVGProps } from "react";

  type DynamicIconProps = {
    name: string;
    fallback?: () => ReactNode;
    size?: string | number;
  } & SVGProps<SVGSVGElement>;

  const DynamicIcon: ForwardRefExoticComponent<
    DynamicIconProps & RefAttributes<SVGSVGElement>
  >;
  export default DynamicIcon;
}
