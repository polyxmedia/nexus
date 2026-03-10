import { describe, it, expect } from "vitest";

const SAMPLE_SECTIONS = [
  {
    heading: "Executive Summary",
    content: "This report covers the current geopolitical landscape and its market implications.",
    bullets: ["Rising tensions in Eastern Europe", "Oil supply disruptions likely", "Defensive positioning recommended"],
  },
  {
    heading: "Signal Analysis",
    content: "Multiple convergent signals detected across GEO, MKT, and OSI layers indicating elevated risk.",
  },
  {
    heading: "Trade Recommendations",
    content: "Based on the analysis above, the following trades are recommended.",
    bullets: ["Long XLE (energy sector hedge)", "Short EUR/USD (geopolitical risk)", "Long VIX calls (tail risk protection)"],
  },
];

describe("Document Generation", () => {
  describe("Tool Executor", () => {
    it("returns correct structure for PDF", async () => {
      // Test the executor function directly (no auth needed)
      const { executeGenerateDocumentForTest } = await import("../tools-test-helpers");
      const result = await executeGenerateDocumentForTest({
        format: "pdf",
        title: "Test Report",
        sections: SAMPLE_SECTIONS,
      });

      expect(result).toHaveProperty("format", "pdf");
      expect(result).toHaveProperty("title", "Test Report");
      expect(result).toHaveProperty("sections");
      expect(result).toHaveProperty("slideCount", 3);
      expect(result).toHaveProperty("generatedAt");
      expect(result.sections).toHaveLength(3);
    });

    it("returns correct structure for PPTX", async () => {
      const { executeGenerateDocumentForTest } = await import("../tools-test-helpers");
      const result = await executeGenerateDocumentForTest({
        format: "pptx",
        title: "Briefing Deck",
        sections: SAMPLE_SECTIONS,
      });

      expect(result).toHaveProperty("format", "pptx");
      expect(result).toHaveProperty("slideCount", 3);
    });

    it("returns error for missing fields", async () => {
      const { executeGenerateDocumentForTest } = await import("../tools-test-helpers");

      const result = await executeGenerateDocumentForTest({ format: "pdf" });
      expect(result).toHaveProperty("error");
    });

    it("handles single section", async () => {
      const { executeGenerateDocumentForTest } = await import("../tools-test-helpers");
      const result = await executeGenerateDocumentForTest({
        format: "pdf",
        title: "Brief",
        sections: [{ heading: "Summary", content: "One section only." }],
      });

      expect(result.slideCount).toBe(1);
    });

    it("handles sections with and without bullets", async () => {
      const { executeGenerateDocumentForTest } = await import("../tools-test-helpers");
      const result = await executeGenerateDocumentForTest({
        format: "pptx",
        title: "Mixed",
        sections: [
          { heading: "With bullets", content: "Text", bullets: ["A", "B"] },
          { heading: "Without bullets", content: "Just text" },
        ],
      });

      expect(result.sections![0].bullets).toEqual(["A", "B"]);
      expect(result.sections![1].bullets).toBeUndefined();
    });
  });
});

describe("PDF Generation", () => {
  it("generates valid PDF binary", async () => {
    // Dynamic import to avoid loading pdfkit in all tests
    const PDFDocument = (await import("pdfkit")).default;

    const doc = new PDFDocument({ size: "A4", margin: 60 });
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve());
      doc.on("error", reject);

      doc.fontSize(20).text("Test Document");
      doc.fontSize(12).text("This is a test page.");
      doc.end();
    });

    const buffer = Buffer.concat(chunks);
    // PDF files start with %PDF
    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(100);
  });
});

describe("PPTX Generation", () => {
  it("generates valid PPTX binary", async () => {
    const PptxGenJS = (await import("pptxgenjs")).default;

    const pptx = new PptxGenJS();
    pptx.title = "Test Presentation";

    const slide = pptx.addSlide();
    slide.addText("Test Slide", { x: 1, y: 1, fontSize: 24 });

    const buffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;

    // PPTX files are ZIP archives starting with PK
    const header = Buffer.from(buffer).toString("ascii", 0, 2);
    expect(header).toBe("PK");
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it("generates multi-slide PPTX", async () => {
    const PptxGenJS = (await import("pptxgenjs")).default;

    const pptx = new PptxGenJS();
    pptx.title = "Multi-Slide Test";

    for (let i = 0; i < 5; i++) {
      const slide = pptx.addSlide();
      slide.addText(`Slide ${i + 1}`, { x: 1, y: 1, fontSize: 24 });
    }

    const buffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});
