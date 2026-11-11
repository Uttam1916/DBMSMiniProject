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
          margin: 16mm 16mm 16mm 16mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          font-size: 9.5pt;
          line-height: 1.5;
          background: #ffffff;
        }
        h1 {
          font-size: 16pt;
          font-weight: 700;
          color: #0f172a;
          border-bottom: 1.5px solid #0f172a;
          padding-bottom: 3px;
          margin-top: 18pt;
          margin-bottom: 8pt;
          page-break-after: avoid;
        }
        h2 {
          font-size: 13pt;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 2px;
          margin-top: 14pt;
          margin-bottom: 6pt;
          page-break-after: avoid;
        }
        h3 {
          font-size: 10.5pt;
          font-weight: 600;
          color: #334155;
          margin-top: 10pt;
          margin-bottom: 4pt;
          page-break-after: avoid;
        }
        h4 {
          font-size: 9.5pt;
          font-weight: 600;
          color: #475569;
          margin-top: 8pt;
          margin-bottom: 3pt;
          page-break-after: avoid;
        }
        p {
          margin-top: 0;
          margin-bottom: 5pt;
          text-align: justify;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5pt;
          margin-bottom: 8pt;
          font-size: 8pt;
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
          font-size: 7.6pt;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 2px;
          padding: 0.5px 3px;
          color: #0f172a;
        }
        pre {
          background: #0f172a;
          color: #f8fafc;
          padding: 7pt 9pt;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 7.2pt;
          line-height: 1.35;
          margin-top: 4pt;
          margin-bottom: 7pt;
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
          max-width: 92%;
          height: auto;
          display: block;
          margin: 6pt auto 8pt auto;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          page-break-inside: avoid;
        }
        blockquote {
          margin: 5pt 0;
          padding: 4pt 8pt;
          border-left: 3px solid #64748b;
          background: #f8fafc;
          color: #334155;
          font-size: 8.5pt;
        }
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 12pt 0;
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

  console.log('Generating clean PDF without top/bottom headers or footers...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${reportHtmlPath}`, { waitUntil: 'load' });
  await page.waitForTimeout(1000); // Allow images to decode

  await page.pdf({
    path: path.join(projectRoot, 'PROJECT_REPORT.pdf'),
    format: 'A4',
    margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
    printBackground: true,
    displayHeaderFooter: false,
  });

  await browser.close();
  fs.unlinkSync(reportHtmlPath);
  console.log('SUCCESS: Clean PROJECT_REPORT.pdf compiled without headers or footers!');
}

buildPdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
