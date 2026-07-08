/** Shared element tree types used by the builder and drag-and-drop layer. */
export type ElementType =
  | "section"
  | "fullSection"
  | "text"
  | "heading"
  | "richText"
  | "icon"
  | "image"
  | "button"
  | "form"
  | "row"
  | "column"
  | "grid"
  | "accordion"
  | "tabs"
  | "carousel"
  | "imageCarousel"
  | "navbar"
  | "featureCard"
  | "card"
  | "footer";

export type BuilderElement = {
  id: string;
  type: ElementType;
  props: Record<string, unknown>;
  children: BuilderElement[];
};
