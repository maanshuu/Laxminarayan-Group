// Generates an official, valid PDF 1.4 Project Brochure & Specifications Sheet
// Uses built-in PDF standards (no external binary dependencies required)

function buildPdf(project) {
  const name = String(project.name || "Laxminarayan Group Project").replace(/[()\\]/g, "");
  const category = String(project.category || "RESIDENTIAL").toUpperCase().replace(/[()\\]/g, "");
  const desc = String(project.description || "Thoughtfully designed spaces crafted with architectural excellence.").replace(/[()\\]/g, "");
  const loc = String(project.location || "Prime Highway & Metro Corridor, Gujarat").replace(/[()\\]/g, "");
  const pricing = String(project.price || "On Request / Flexible Payment Milestones").replace(/[()\\]/g, "");
  const amenities = String(project.amenities || "Clubhouse, Landscaped Gardens, 24/7 Security, High-Speed Elevators, EV Charging").replace(/[()\\]/g, "");

  // Stream content drawing text, banners, and layout boxes
  const streamLines = [
    // Background card
    "0.96 0.97 0.98 rg",
    "20 720 555 100 re f",
    // Header brand bar
    "0.03 0.52 0.78 rg",
    "20 800 555 22 re f",
    "q",
    "1 1 1 rg",
    "BT",
    "/F2 10 Tf",
    "35 807 Td",
    "(LAXMINARAYAN GROUP  |  ARCHITECTURAL EXCELLENCE & LUXURY DEVELOPMENT) Tj",
    "ET",
    "Q",

    // Project title & category
    "0.03 0.05 0.08 rg",
    "BT",
    "/F2 24 Tf",
    "35 762 Td",
    `(${name}) Tj`,
    "ET",

    "0.03 0.52 0.78 rg",
    "BT",
    "/F2 11 Tf",
    "35 738 Td",
    `(${category} COLLECTION  |  PRESTIGE LIVING) Tj`,
    "ET",

    // Horizontal divider
    "0.85 0.88 0.92 RG",
    "1 w",
    "20 705 m 575 705 l S",

    // Overview section heading
    "0.03 0.05 0.08 rg",
    "BT",
    "/F2 14 Tf",
    "35 675 Td",
    "(PROJECT OVERVIEW & CONCEPT) Tj",
    "ET",

    // Overview text
    "0.25 0.32 0.36 rg",
    "BT",
    "/F1 11 Tf",
    "35 650 Td",
    "16 TL",
    `(${desc.slice(0, 85)}) Tj T*`,
    `(${desc.slice(85, 175) || "Crafted to match modern lifestyles with comfort, elegance and long-term investment value."}) Tj`,
    "ET",

    // Specifications Bento Box
    "0.94 0.96 0.98 rg",
    "20 480 555 135 re f",
    "0.82 0.89 0.95 RG",
    "1 w",
    "20 480 555 135 re S",

    "0.03 0.52 0.78 rg",
    "BT",
    "/F2 12 Tf",
    "35 590 Td",
    "(KEY SPECIFICATIONS & HIGHLIGHTS) Tj",
    "ET",

    "0.15 0.20 0.25 rg",
    "BT",
    "/F2 10 Tf",
    "35 565 Td",
    "(Location & Connectivity:) Tj",
    "/F1 10 Tf",
    `140 0 Td (${loc}) Tj`,
    "-140 -20 Td",
    "/F2 10 Tf",
    "(Pricing & Configuration:) Tj",
    "/F1 10 Tf",
    `140 0 Td (${pricing}) Tj`,
    "-140 -20 Td",
    "/F2 10 Tf",
    "(Selected Amenities:) Tj",
    "/F1 10 Tf",
    `140 0 Td (${amenities.slice(0, 65)}) Tj`,
    "-140 -20 Td",
    "/F2 10 Tf",
    "(RERA Compliance:) Tj",
    "/F1 10 Tf",
    "140 0 Td (Approved & Registered under Real Estate Regulatory Authority) Tj",
    "ET",

    // Investment & Booking Process Box
    "0.98 0.98 0.99 rg",
    "20 310 555 140 re f",
    "0.88 0.90 0.92 RG",
    "1 w",
    "20 310 555 140 re S",

    "0.03 0.05 0.08 rg",
    "BT",
    "/F2 13 Tf",
    "35 425 Td",
    "(EXCLUSIVE BUYER ASSISTANCE & SITE VISITS) Tj",
    "ET",

    "0.25 0.32 0.36 rg",
    "BT",
    "/F1 10 Tf",
    "35 400 Td",
    "15 TL",
    "(1. Personal Walkthrough: Schedule a dedicated site visit with our senior advisory team.) Tj T*",
    "(2. Unit Reservation: Real-time inventory matrix tracking with 1-click token hold.) Tj T*",
    "(3. Flexible Payment Schedules: Construction-linked plans designed for peace of mind.) Tj T*",
    "(4. Legal & Agreement Transparency: Zero hidden fees, clear documentation and title guarantee.) Tj",
    "ET",

    // Footer Contact Bar
    "0.03 0.05 0.08 rg",
    "20 60 555 75 re f",
    "1 1 1 rg",
    "BT",
    "/F2 12 Tf",
    "35 110 Td",
    "(CONTACT LAXMINARAYAN GROUP HEADQUARTERS) Tj",
    "/F1 10 Tf",
    "0 -18 Td",
    "(Phone / WhatsApp: +91 6352000017   |   Email: sales@laxminarayangroup.com) Tj",
    "0 -16 Td",
    "(Website: https://laxminarayangroup.com   |   Gujarat, India) Tj",
    "ET"
  ];

  const stream = streamLines.join("\n");
  const streamBytes = Buffer.byteLength(stream, "utf8");

  // Build PDF Objects
  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj"
  );
  objects.push(`4 0 obj\n<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream\nendobj`);
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  objects.push("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");

  let offset = 0;
  const header = "%PDF-1.4\n";
  offset += Buffer.byteLength(header, "utf8");

  const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];

  let body = "";
  for (const obj of objects) {
    const formattedOffset = String(offset).padStart(10, "0");
    xref.push(`${formattedOffset} 00000 n `);
    body += obj + "\n";
    offset += Buffer.byteLength(obj + "\n", "utf8");
  }

  const startxref = offset;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(header + body + xref.join("\n") + "\n" + trailer, "utf8");
}

module.exports = { buildPdf };
