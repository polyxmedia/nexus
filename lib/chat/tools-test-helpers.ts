// Test-friendly version of document generation executor (no DB dependencies)

export async function executeGenerateDocumentForTest(input: Record<string, unknown>) {
  const format = input.format as "pdf" | "pptx" | undefined;
  const title = input.title as string | undefined;
  const sections = input.sections as Array<{
    heading: string;
    content: string;
    bullets?: string[];
  }> | undefined;

  if (!format || !title || !sections?.length) {
    return { error: "Missing format, title, or sections" };
  }

  return {
    format,
    title,
    sections,
    slideCount: sections.length,
    generatedAt: new Date().toISOString(),
  };
}
