import { printHtmlInline } from './printWithIframe';
import type { CaseRecord } from './types';

export type ReportColumn = {
  key: string;
  label: string;
  accessor: (record: CaseRecord) => string;
};

const buildReportMarkup = (
  rows: CaseRecord[],
  columns: ReportColumn[],
  generatedAt: string
) => ({
  head: `
    <meta charset="utf-8" />
    <title>Report mezzi con tutti i titoli</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 14mm 18mm;
      }

      body {
        font-family: "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
      }

      h1 {
        text-align: center;
        font-size: 22px;
        margin: 0 0 6px;
      }

      p {
        margin: 0 0 18px;
        color: #475569;
        text-align: center;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      thead {
        background: rgba(37, 99, 235, 0.08);
      }

      th,
      td {
        border: 1px solid rgba(148, 163, 184, 0.4);
        padding: 6px 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        color: #1e3a8a;
      }

      tbody tr:nth-child(even) {
        background: rgba(226, 232, 240, 0.35);
      }
    </style>
  `,
  body: `
    <h1>Report mezzi con tutti i titoli</h1>
    <p>Generato il ${generatedAt} • Pratiche incluse: ${rows.length}</p>
    <table>
      <thead>
        <tr>
          ${columns.map((column) => `<th>${column.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (record) => `<tr>${columns
              .map((column) => `<td>${column.accessor(record) || '—'}</td>`)
              .join('')}</tr>`
          )
          .join('')}
      </tbody>
    </table>
  `,
});

export async function printReportDocument(
  rows: CaseRecord[],
  columns: ReportColumn[]
): Promise<void> {
  const generatedAt = new Date().toLocaleString('it-IT');
  const { head, body } = buildReportMarkup(rows, columns, generatedAt);
  const html = `<!DOCTYPE html><html lang="it"><head>${head}</head><body>${body}</body></html>`;
  await printHtmlInline(html, { printDelayMs: 200 });
}

