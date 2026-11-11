const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

async function buildPdf() {
  const projectRoot = path.join(__dirname, '..');
  const reportMd = fs.readFileSync(path.join(projectRoot, 'PROJECT_REPORT.md'), 'utf-8');

  // Convert markdown to HTML
  const parsedHtml = marked.parse(reportMd);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>DBMS Mini Project Report - Level 3</title>
      <style>
        @page {
          size: A4;
          margin: 18mm 16mm 18mm 16mm;
          @bottom-right {
            content: counter(page);
          }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          font-size: 10pt;
          line-height: 1.5;
          background: #ffffff;
        }
        h1 {
          font-size: 18pt;
          font-weight: 700;
          color: #0f172a;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 4px;
          margin-top: 20pt;
          margin-bottom: 8pt;
          page-break-after: avoid;
        }
        h2 {
          font-size: 13.5pt;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 3px;
          margin-top: 16pt;
          margin-bottom: 6pt;
          page-break-after: avoid;
        }
        h3 {
          font-size: 11pt;
          font-weight: 600;
          color: #334155;
          margin-top: 12pt;
          margin-bottom: 4pt;
          page-break-after: avoid;
        }
        h4 {
          font-size: 10pt;
          font-weight: 600;
          color: #475569;
          margin-top: 8pt;
          margin-bottom: 3pt;
          page-break-after: avoid;
        }
        p {
          margin-top: 0;
          margin-bottom: 6pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6pt;
          margin-bottom: 10pt;
          font-size: 8.5pt;
          page-break-inside: avoid;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 4pt 6pt;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #0f172a;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 7.8pt;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 3px;
          padding: 1px 3px;
          color: #0f172a;
        }
        pre {
          background: #0f172a;
          color: #f8fafc;
          padding: 8pt 10pt;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 7.5pt;
          line-height: 1.4;
          margin-top: 4pt;
          margin-bottom: 8pt;
          page-break-inside: avoid;
        }
        pre code {
          background: transparent;
          border: none;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }
        img {
          max-width: 95%;
          height: auto;
          display: block;
          margin: 8pt auto;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          page-break-inside: avoid;
        }
        blockquote {
          margin: 6pt 0;
          padding: 5pt 8pt;
          border-left: 3px solid #3b82f6;
          background: #eff6ff;
          color: #1e40af;
          font-size: 8.5pt;
          border-radius: 0 4px 4px 0;
        }
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 14pt 0;
        }
      </style>
    </head>
    <body>
      ${parsedHtml}
    </body>
    </html>
  `;

  const reportHtmlPath = path.join(projectRoot, 'report_preview.html');
  fs.writeFileSync(reportHtmlPath, htmlContent, 'utf-8');

  console.log('Generating PDF via Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${reportHtmlPath}`, { waitUntil: 'load' });
  await page.waitForTimeout(1000); // Wait for local images to decode

  await page.pdf({
    path: path.join(projectRoot, 'PROJECT_REPORT.pdf'),
    format: 'A4',
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
    printBackground: true,
  });

  await browser.close();
  // Remove temporary HTML preview
  fs.unlinkSync(reportHtmlPath);
  console.log('SUCCESS: PROJECT_REPORT.pdf created!');
}

buildPdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
