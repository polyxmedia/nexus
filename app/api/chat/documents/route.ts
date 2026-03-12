import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { validateOrigin } from "@/lib/security/csrf";

// Force Node.js runtime for native deps (pdfkit, pptxgenjs)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST - generate a document (PDF or PPTX)
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { format, title, sections } = body as {
      format: "pdf" | "pptx";
      title: string;
      sections: Array<{
        heading: string;
        content: string;
        bullets?: string[];
      }>;
    };

    if (!format || !title || !sections?.length) {
      return NextResponse.json({ error: "Missing format, title, or sections" }, { status: 400 });
    }

    if (format === "pptx") {
      return generatePptx(title, sections);
    } else if (format === "pdf") {
      return generatePdf(title, sections);
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (err) {
    console.error("[Documents] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Document generation failed: ${message}` }, { status: 500 });
  }
}

async function generatePptx(
  title: string,
  sections: Array<{ heading: string; content: string; bullets?: string[] }>
) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "NEXUS Intelligence Platform";
  pptx.title = title;

  // Define colors
  const bg = "0A0A14";
  const textPrimary = "E5E5E5";
  const textSecondary = "8B8B9E";
  const accent = "22D3EE";

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: bg };
  titleSlide.addText("NEXUS", {
    x: 0.8,
    y: 0.6,
    w: "80%",
    fontSize: 11,
    fontFace: "Courier New",
    color: accent,
    charSpacing: 6,
    bold: true,
  });
  titleSlide.addText(title, {
    x: 0.8,
    y: 1.8,
    w: "80%",
    fontSize: 32,
    fontFace: "Arial",
    color: textPrimary,
    bold: true,
  });
  titleSlide.addText(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), {
    x: 0.8,
    y: 3.2,
    w: "80%",
    fontSize: 13,
    fontFace: "Courier New",
    color: textSecondary,
  });
  // Bottom line accent
  titleSlide.addShape("rect" as unknown as Parameters<typeof titleSlide.addShape>[0], {
    x: 0.8,
    y: 4.2,
    w: 2.5,
    h: 0.04,
    fill: { color: accent },
  });

  // Content slides
  for (const section of sections) {
    const slide = pptx.addSlide();
    slide.background = { color: bg };

    // Section heading
    slide.addText((section.heading || "").toUpperCase(), {
      x: 0.8,
      y: 0.5,
      w: "85%",
      fontSize: 11,
      fontFace: "Courier New",
      color: accent,
      charSpacing: 4,
      bold: true,
    });

    // Accent line under heading
    slide.addShape("rect" as unknown as Parameters<typeof titleSlide.addShape>[0], {
      x: 0.8,
      y: 0.95,
      w: 1.5,
      h: 0.03,
      fill: { color: accent },
    });

    // Content body
    slide.addText(section.content, {
      x: 0.8,
      y: 1.3,
      w: "85%",
      h: section.bullets?.length ? 2.0 : 4.0,
      fontSize: 14,
      fontFace: "Arial",
      color: textPrimary,
      lineSpacingMultiple: 1.3,
      valign: "top",
      paraSpaceAfter: 6,
    });

    // Bullets
    if (section.bullets?.length) {
      const bulletY = 3.5;
      const bulletTexts = section.bullets.map((b) => ({
        text: b,
        options: {
          fontSize: 12,
          fontFace: "Arial" as const,
          color: textSecondary,
          bullet: { code: "2022", color: accent } as const,
          paraSpaceAfter: 4,
        },
      }));
      slide.addText(bulletTexts, {
        x: 0.8,
        y: bulletY,
        w: "85%",
        h: 3.0,
        valign: "top",
      });
    }

    // Footer
    slide.addText("NEXUS Intelligence Platform", {
      x: 0.8,
      y: 7.0,
      w: "40%",
      fontSize: 8,
      fontFace: "Courier New",
      color: "4A4A5E",
    });
  }

  const buffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}.pptx`;

  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function generatePdf(
  title: string,
  sections: Array<{ heading: string; content: string; bullets?: string[] }>
) {
  const PDFDocument = (await import("pdfkit")).default;
  return new Promise<Response>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 60,
        info: {
          Title: title,
          Author: "NEXUS Intelligence Platform",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}.pdf`;
        resolve(
          new Response(buffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          })
        );
      });
      doc.on("error", reject);

      // Colors
      const bg = "#0A0A14";
      const textPrimary = "#E5E5E5";
      const textSecondary = "#8B8B9E";
      const accent = "#22D3EE";
      const pageW = doc.page.width;
      const pageH = doc.page.height;

      const fillBg = () => {
        doc.save();
        doc.rect(0, 0, pageW, pageH).fill(bg);
        doc.restore();
      };

      // Title page
      fillBg();
      doc.fontSize(10).font("Courier").fillColor(accent).text("NEXUS", 60, 80, { characterSpacing: 4 });
      doc.moveTo(60, 100).lineTo(140, 100).strokeColor(accent).lineWidth(1.5).stroke();
      doc.fontSize(28).font("Helvetica-Bold").fillColor(textPrimary).text(title, 60, 140, { width: 470 });
      doc
        .fontSize(11)
        .font("Courier")
        .fillColor(textSecondary)
        .text(
          new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          60,
          doc.y + 20
        );

      // Sections - flow content continuously, only add page when needed
      let firstSection = true;
      for (const section of sections) {
        if (firstSection) {
          doc.addPage();
          fillBg();
          doc.y = 60;
          firstSection = false;
        } else {
          // Check if we need a new page (less than 120pt remaining)
          if (doc.y > pageH - 120) {
            doc.addPage();
            fillBg();
            doc.y = 60;
          } else {
            doc.moveDown(1.5);
          }
        }

        // Section heading
        doc.fontSize(10).font("Courier").fillColor(accent).text((section.heading || "").toUpperCase(), 60, doc.y, { characterSpacing: 3 });
        const lineY = doc.y + 6;
        doc.moveTo(60, lineY).lineTo(150, lineY).strokeColor(accent).lineWidth(1).stroke();

        // Content
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor(textPrimary)
          .text(section.content, 60, lineY + 12, {
            width: 470,
            lineGap: 4,
          });

        // Bullets
        if (section.bullets?.length) {
          doc.moveDown(0.5);
          for (const bullet of section.bullets) {
            // Check if we need a page break mid-bullets
            if (doc.y > pageH - 80) {
              doc.addPage();
              fillBg();
              doc.y = 60;
            }
            doc
              .fontSize(10)
              .font("Helvetica")
              .fillColor(accent)
              .text("\u2022  ", 70, doc.y, { continued: true })
              .fillColor(textSecondary)
              .text(bullet, { width: 440, lineGap: 3 });
            doc.moveDown(0.2);
          }
        }
      }

      // Footer on last page
      doc
        .fontSize(7)
        .font("Courier")
        .fillColor("#4A4A5E")
        .text("NEXUS Intelligence Platform", 60, pageH - 40);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
