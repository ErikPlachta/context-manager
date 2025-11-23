import { TemplateRenderContext } from "../types/template.types";

export const applyReplacements = (contents: string, context: TemplateRenderContext): string => {
  return Object.keys(context).reduce((acc, key) => {
    const value = context[key];
    const pattern = new RegExp(`{{${key}}}`, "g");
    return acc.replace(pattern, String(value ?? ""));
  }, contents);
};
