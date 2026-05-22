export type TemplateContext = Record<string, string>;

const PLACEHOLDER = /\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g;

export const applyTemplate = (body: string, context: TemplateContext): string => {
  return body.replace(PLACEHOLDER, (_match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(context, name)) {
      throw new Error(`Unknown template variable: ${name}`);
    }
    return context[name] as string;
  });
};
