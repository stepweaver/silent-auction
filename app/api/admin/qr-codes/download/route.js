import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';

const getSiteUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured || configured.trim() === '') {
    return 'http://localhost:3000';
  }
  return configured.replace(/\/$/, '');
};

const wrapText = (text, font, size, maxWidth) => {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const prospective = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(prospective, size);
    if (width <= maxWidth) {
      currentLine = prospective;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

export async function GET() {
  const headersList = await headers();

  if (!checkBasicAuth(headersList)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const supabase = supabaseServer();
    const { data: items, error } = await supabase
      .from('items')
      .select('id, title, slug, description, start_price')
      .order('title', { ascending: true });

    if (error) {
      console.error('Failed to load items for QR export:', error);
      return new Response('Failed to load items', { status: 500 });
    }

    if (!items || items.length === 0) {
      return new Response('No items to export', { status: 400 });
    }

    const siteUrl = getSiteUrl();
    const [{ PDFDocument, StandardFonts, rgb }, { Buffer }] = await Promise.all([
      import('pdf-lib'),
      import('node:buffer'),
    ]);

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 612; // 8.5in * 72
    const pageHeight = 792; // 11in * 72
    const margin = 48;
    const maxContentWidth = pageWidth - margin * 2;

    for (const item of items) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      let cursorY = pageHeight - margin;

      const drawCentered = (text, font, size, color = rgb(0, 0, 0), spacing = 12) => {
        if (!text) return;
        const textWidth = font.widthOfTextAtSize(text, size);
        cursorY -= size;
        page.drawText(text, {
          x: (pageWidth - textWidth) / 2,
          y: cursorY,
          size,
          font,
          color,
        });
        cursorY -= spacing;
      };

      drawCentered('Mary Frank Elementary PTO Silent Auction', fontRegular, 12, rgb(0.023, 0.35, 0.2));
      drawCentered(item.title || 'Auction Item', fontBold, 28, rgb(0.07, 0.09, 0.15), 18);

      const itemUrl = `${siteUrl}/i/${item.slug}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(itemUrl)}`;

      try {
        const response = await fetch(qrUrl);
        if (!response.ok) {
          throw new Error(`QR request failed (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const imageEmbed = await pdfDoc.embedPng(arrayBuffer);
        const qrSize = Math.min(maxContentWidth, 360);
        cursorY -= qrSize;
        page.drawImage(imageEmbed, {
          x: (pageWidth - qrSize) / 2,
          y: cursorY,
          width: qrSize,
          height: qrSize,
        });
        cursorY -= 24;
      } catch (err) {
        console.error('Failed fetching QR image for item', item?.id, err);
        drawCentered('Error generating QR code for this item.', fontBold, 14, rgb(0.73, 0.11, 0.11));
      }

      drawCentered('Scan to view item & place bids', fontRegular, 12, rgb(0.12, 0.16, 0.22), 8);

      cursorY -= 12;
      const urlWidth = fontRegular.widthOfTextAtSize(itemUrl, 10);
      page.drawText(itemUrl, {
        x: (pageWidth - urlWidth) / 2,
        y: cursorY,
        size: 10,
        font: fontRegular,
        color: rgb(0.36, 0.42, 0.49),
      });
      cursorY -= 24;

      if (item.start_price) {
        drawCentered(`Starting bid: $${Number(item.start_price).toFixed(2)}`, fontRegular, 12, rgb(0.02, 0.28, 0.17));
      }

      if (item.description) {
        cursorY -= 6;
        const bodySize = 11;
        const lines = wrapText(item.description, fontRegular, bodySize, maxContentWidth);
        lines.forEach((line) => {
          const textWidth = fontRegular.widthOfTextAtSize(line, bodySize);
          cursorY -= bodySize;
          page.drawText(line, {
            x: (pageWidth - textWidth) / 2,
            y: cursorY,
            size: bodySize,
            font: fontRegular,
            color: rgb(0.22, 0.26, 0.31),
          });
          cursorY -= 6;
        });
        cursorY -= 12;
      }

      cursorY = Math.max(cursorY, margin);
      page.drawText('Mary Frank Elementary PTO • Silent Auction', {
        x: (pageWidth - fontRegular.widthOfTextAtSize('Mary Frank Elementary PTO • Silent Auction', 10)) / 2,
        y: margin,
        size: 10,
        font: fontRegular,
        color: rgb(0.42, 0.45, 0.48),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const body = Buffer.from(pdfBytes);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="silent-auction-qr-codes.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('QR code export failed:', error);
    return new Response('Failed to generate QR export', { status: 500 });
  }
}

