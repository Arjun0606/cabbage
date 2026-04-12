import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/extract-pdf
 *
 * Accepts a PDF file upload, extracts text content using pdf-parse or
 * a lightweight regex approach for simple PDFs. Returns the extracted text
 * so the frontend can store it in the company documents.
 *
 * For v1 we use a lightweight extraction approach that works without
 * heavy dependencies. For production, consider pdf-parse or a cloud service.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // Size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic text extraction from PDF binary
    let text = "";
    {
      const raw = buffer.toString("latin1");
      const textChunks: string[] = [];

      // Extract text from PDF text objects (BT...ET blocks)
      const btEtRegex = /BT\s([\s\S]*?)ET/g;
      let match;
      while ((match = btEtRegex.exec(raw)) !== null) {
        const block = match[1];
        // Extract text from Tj and TJ operators
        const tjRegex = /\(([^)]*)\)\s*Tj/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          textChunks.push(tjMatch[1]);
        }
        // TJ arrays
        const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
        let tjArrMatch;
        while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
          const inner = tjArrMatch[1];
          const parts = inner.match(/\(([^)]*)\)/g);
          if (parts) {
            textChunks.push(parts.map(p => p.slice(1, -1)).join(""));
          }
        }
      }

      text = textChunks.join(" ").replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();

      if (!text) {
        // Last resort: extract any readable ASCII strings
        const readable = raw.match(/[A-Za-z0-9\s,.!?@#$%&*()\-+=:;'"\/]{20,}/g);
        text = readable ? readable.join("\n").trim() : "";
      }
    }

    if (!text.trim()) {
      return NextResponse.json({
        error: "Could not extract text from this PDF. It may be image-based or encrypted. Try copy-pasting the text instead.",
      }, { status: 422 });
    }

    // Limit extracted text to ~50k chars to avoid overwhelming localStorage
    const trimmed = text.trim().substring(0, 50000);

    return NextResponse.json({
      text: trimmed,
      fileName: file.name,
      charCount: trimmed.length,
      truncated: text.length > 50000,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF extraction failed" },
      { status: 500 }
    );
  }
}
