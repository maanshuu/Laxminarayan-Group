// Generates an official, compliant PDF 1.4 Allotment Letter & Booking Confirmation
// Uses built-in PDF vector engine with zero external binary dependencies.

function sanitize(str) {
  return String(str || "").replace(/[()\\]/g, "").replace(/\r?\n/g, " ");
}

function buildAllotmentPdf(booking) {
  const ref = sanitize(booking.booking_reference || `BK-${booking.id || Date.now()}`);
  const dateStr = sanitize(booking.created_at ? booking.created_at.split(' ')[0] : new Date().toISOString().split('T')[0]);
  const customerName = sanitize(booking.customer_name || "Valued Allottee");
  const customerPhone = sanitize(booking.customer_phone || "Not Provided");
  const customerEmail = sanitize(booking.customer_email || "Not Provided");
  const projectName = sanitize(booking.project_name || "Laxminarayan Landmark");
  const unitNumber = sanitize(booking.unit_number || booking.allotted_unit || "Unit Reserved");
  const agreementVal = sanitize(booking.agreement_value || "As per agreed cost sheet");
  const tokenVal = sanitize(booking.token_amount || "Token Received");
  const paymentStatus = sanitize((booking.payment_status || "confirmed").replace(/_/g, " ").toUpperCase());

  const streamLines = [
    // Top Gold Keyline & Corporate Header Bar
    "0.85 0.53 0.05 rg",
    "20 818 555 4 re f",
    "0.04 0.07 0.16 rg",
    "20 740 555 78 re f",

    // Brand Monogram Box
    "1 1 1 rg",
    "35 756 46 46 re f",
    "0.04 0.07 0.16 rg",
    "BT",
    "/F2 20 Tf",
    "45 771 Td",
    "(LG) Tj",
    "ET",

    // Header Title
    "1 1 1 rg",
    "BT",
    "/F2 16 Tf",
    "95 785 Td",
    "(LAXMINARAYAN GROUP) Tj",
    "/F1 9 Tf",
    "0 -14 Td",
    "(ARCHITECTURAL EXCELLENCE & LUXURY ASSET DEVELOPMENT) Tj",
    "0 -12 Td",
    "(Registered Office: 5, Ground floor, Madhav Evenue, odhav circle, Ahmedabad) Tj",
    "ET",

    // Document Subject Badge
    "0.96 0.97 0.98 rg",
    "20 686 555 40 re f",
    "0.85 0.53 0.05 RG",
    "1 w",
    "20 686 555 40 re S",
    "0.04 0.07 0.16 rg",
    "BT",
    "/F2 14 Tf",
    "35 704 Td",
    "(OFFICIAL PROVISIONAL ALLOTMENT LETTER & BOOKING CONFIRMATION) Tj",
    "/F1 9 Tf",
    "0 -13 Td",
    `(${ref}   |   Date of Issuance: ${dateStr}) Tj`,
    "ET",

    // Salutation
    "0.15 0.20 0.25 rg",
    "BT",
    "/F1 10 Tf",
    "35 660 Td",
    "(Dear Sir / Madam,) Tj",
    "0 -14 Td",
    "(We take immense pleasure in confirming the provisional allotment of your real estate unit at Laxminarayan Group.) Tj",
    "0 -13 Td",
    "(The particulars of the allotted inventory and commercial consideration are stipulated hereunder:) Tj",
    "ET",

    // SECTION 1: ALLOTTEE & PROPERTY TABLE
    "0.04 0.07 0.16 rg",
    "35 595 525 18 re f",
    "1 1 1 rg",
    "BT",
    "/F2 9.5 Tf",
    "45 600 Td",
    "(PART A: ALLOTTEE & PROPERTY INVENTORY PARTICULARS) Tj",
    "ET",

    // Table Grid Lines & Rows
    "0.88 0.91 0.94 RG",
    "1 w",
    "35 515 525 80 re S",
    "35 575 m 560 575 l S",
    "35 555 m 560 555 l S",
    "35 535 m 560 535 l S",
    "200 515 m 200 595 l S",

    // Row 1: Purchaser
    "0.35 0.40 0.45 rg",
    "BT",
    "/F2 9 Tf",
    "45 580 Td",
    "(Allottee Name:) Tj",
    "/F1 9.5 Tf",
    "165 0 Td",
    `(${customerName}) Tj`,
    "ET",

    // Row 2: Contact
    "0.35 0.40 0.45 rg",
    "BT",
    "/F2 9 Tf",
    "45 560 Td",
    "(Contact Details:) Tj",
    "/F1 9.5 Tf",
    "165 0 Td",
    `(${customerPhone}   |   ${customerEmail}) Tj`,
    "ET",

    // Row 3: Project
    "0.35 0.40 0.45 rg",
    "BT",
    "/F2 9 Tf",
    "45 540 Td",
    "(Project Landmark:) Tj",
    "/F1 9.5 Tf",
    "165 0 Td",
    `(${projectName}) Tj`,
    "ET",

    // Row 4: Allotted Unit
    "0.35 0.40 0.45 rg",
    "BT",
    "/F2 9 Tf",
    "45 520 Td",
    "(Allotted Unit / Residence:) Tj",
    "/F2 10 Tf",
    "0.04 0.07 0.16 rg",
    "165 0 Td",
    `(${unitNumber}) Tj`,
    "ET",

    // SECTION 2: FINANCIAL CONSIDERATION
    "0.04 0.07 0.16 rg",
    "35 480 525 18 re f",
    "1 1 1 rg",
    "BT",
    "/F2 9.5 Tf",
    "45 485 Td",
    "(PART B: FINANCIAL CONSIDERATION & TOKEN ACKNOWLEDGMENT) Tj",
    "ET",

    "0.88 0.91 0.94 RG",
    "1 w",
    "35 420 525 60 re S",
    "35 460 m 560 460 l S",
    "35 440 m 560 440 l S",
    "200 420 m 200 480 l S",

    // Fin Row 1: Total Agreed Valuation
    "0.35 0.40 0.45 rg",
    "BT",
    "/F2 9 Tf",
    "45 466 Td",
    "(Agreed Sale Value:) Tj",
    "/F2 10 Tf",
    "0.04 0.07 0.16 rg",
    "165 0 Td",
    `(${agreementVal}) Tj`,
    "ET",

    // Fin Row 2: Token Earnest Received
    "0.35 0.40 0.45 rg",
    "BT",
    "/F2 9 Tf",
    "45 446 Td",
    "(Token / Booking Deposit:) Tj",
    "/F2 10 Tf",
    "0.05 0.60 0.35 rg",
    "165 0 Td",
    `(${tokenVal}   [${paymentStatus}]) Tj`,
    "ET",

    // Fin Row 3: Payment Milestone Plan
    "0.35 0.40 0.45 rg",
    "BT",
    "/F2 9 Tf",
    "45 426 Td",
    "(Payment Schedule Structure:) Tj",
    "/F1 9 Tf",
    "0.15 0.20 0.25 rg",
    "165 0 Td",
    "(Construction-Linked Milestone Plan as per RERA Agreement) Tj",
    "ET",

    // SECTION 3: STATUTORY CONDITIONS & RERA DISCLOSURES
    "0.04 0.07 0.16 rg",
    "BT",
    "/F2 9.5 Tf",
    "35 395 Td",
    "(TERMS OF ALLOTMENT & REGULATORY DISCLOSURES:) Tj",
    "/F1 8.5 Tf",
    "0 -14 Td",
    "13 TL",
    "(1. This allotment is provisional and subject to execution of registered Agreement for Sale within thirty (30) days.) Tj T*",
    "(2. The project is compliant with Real Estate Regulatory Authority (RERA) norms and approved building bylaws.) Tj T*",
    "(3. All milestone installments shall be payable by Account Payee Cheque / NEFT / RTGS in designated project account.) Tj T*",
    "(4. Possession shall be handed over upon receipt of Occupancy Certificate (OC) and full settlement of accounts.) Tj",
    "ET",

    // SIGNATURE BLOCKS
    "0.88 0.91 0.94 RG",
    "1 w",
    "35 150 240 85 re S",
    "320 150 240 85 re S",

    // Signature 1: Developer
    "0.04 0.07 0.16 rg",
    "BT",
    "/F2 9 Tf",
    "45 218 Td",
    "(FOR LAXMINARAYAN GROUP) Tj",
    "/F1 8 Tf",
    "0 -36 Td",
    "(Authorized Developer Signatory) Tj",
    "0 -10 Td",
    "(Corporate Allotment Cell) Tj",
    "ET",

    // Signature 2: Allottee
    "0.04 0.07 0.16 rg",
    "BT",
    "/F2 9 Tf",
    "330 218 Td",
    "(ALLOTTEE ACCEPTANCE) Tj",
    "/F1 8 Tf",
    "0 -36 Td",
    `(${customerName}) Tj`,
    "0 -10 Td",
    "(Signature of Primary Purchaser) Tj",
    "ET",

    // Footer Bar
    "0.04 0.07 0.16 rg",
    "20 40 555 42 re f",
    "1 1 1 rg",
    "BT",
    "/F2 9 Tf",
    "35 64 Td",
    "(LAXMINARAYAN GROUP  |  CONSTRUCTION & REAL ESTATE EXCELLENCE) Tj",
    "/F1 8 Tf",
    "0 -12 Td",
    "(Contact: +91 6352000017   |   Email: corporate@laxminarayangroup.com   |   Web: laxminarayangroup.com) Tj",
    "ET"
  ];

  const stream = streamLines.join("\n");
  const streamBytes = Buffer.byteLength(stream, "utf8");

  // Build PDF 1.4 Object Graph
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

module.exports = { buildAllotmentPdf };
