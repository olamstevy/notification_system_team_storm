export interface CreateTemplateDto {
  code: string;
  subject?: string;
  body: string;
  language?: string;
}

export interface RenderTemplateDto {
  variables: Record<string, string>;
}
