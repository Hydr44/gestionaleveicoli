import { printHtmlInline } from './printWithIframe';
import type { ReleasePrintPayload } from './types';

const buildReleaseMarkup = (data: ReleasePrintPayload, origin: string) => ({
  head: `
    <meta charset="utf-8" />
    <title>Foglio rilascio veicolo</title>
    <style>
      @page {
        size: A4;
        margin: 18mm 22mm 24mm 22mm;
      }

      body {
        font-family: "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
      }

      .page {
        max-width: 720px;
        margin: 0 auto;
        padding: 0;
        line-height: 1.6;
        font-size: 14px;
      }

      .header {
        margin-bottom: 12px;
      }

      .logo {
        display: flex;
        justify-content: flex-start;
        margin-bottom: 8px;
      }

      .logo img {
        width: 220px;
        max-width: 100%;
      }

      h1 {
        font-size: 22px;
        text-align: center;
        margin: 0 0 18px;
        letter-spacing: 0.02em;
      }

      p {
        margin: 0 0 14px;
      }

      .note {
        font-style: italic;
        color: #475569;
        margin-top: -6px;
        margin-bottom: 18px;
      }

      ul {
        margin: 0 0 18px 22px;
        padding: 0;
      }

      li {
        margin: 4px 0;
      }

      strong {
        color: #0f172a;
      }

      .location {
        font-size: 15px;
        margin: 32px 0 42px;
      }

      .signature-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 42px;
      }

      .signature {
        text-align: center;
      }

      .signature span {
        display: block;
        font-weight: 600;
        margin-bottom: 44px;
      }

      .signature .line {
        height: 1px;
        width: 100%;
        background: #94a3b8;
      }
    </style>
  `,
  body: `
    <div class="page">
      <div class="header">
        <div class="logo">
          <img src="${origin}/logo_scozzarini.png" alt="Scozzarini Service Car" />
        </div>
      </div>

      <h1>DICHIARAZIONE DI CONSEGNA VEICOLO O BENE DISSEQUESTRATO</h1>

      <p>
        Dovendo dar seguito alle disposizioni relative al
        <strong>Procedimento n. ${data.procedimentoNumero}</strong>, così come disposto da
        <strong>${data.dispostoDa}</strong> di <strong>${data.ufficioDi}</strong> in data
        <strong>${data.dataDisposizione}</strong>.
      </p>

      <p>
        È avuta la presenza, alle ore <strong>${data.oraPresenza}</strong> di oggi, del Sig.
        <strong>${data.nome}</strong>, nato a <strong>${data.luogoNascita}</strong> il
        <strong>${data.dataNascita}</strong>, residente a <strong>${data.residenza}</strong>,
        via <strong>${data.via}</strong>.
      </p>

      <p class="note">
        (Persona che materialmente presenta/consegna l’originale del verbale di dissequestro, come
        proprietario e/o delegato.)
      </p>

      <p>Con la presente si consegna il veicolo:</p>
      <ul>
        <li><strong>Marca:</strong> ${data.marca}</li>
        <li><strong>Targa:</strong> ${data.targa}</li>
        <li><strong>Telaio:</strong> ${data.telaio}</li>
      </ul>

      <p>
        Il suddetto Sig. <strong>${data.nome}</strong>, contestualmente prende visione che il bene/veicolo
        gli viene consegnato nelle stesse condizioni in cui versava al momento del sequestro e pertanto
        sottoscrive, esonerando il custode da qualsiasi responsabilità futura.
      </p>

      <p class="location"><strong>Gela, ${data.dataGela}</strong></p>

      <div class="signature-row">
        <div class="signature">
          <span>Il Proprietario / Delegato</span>
          <div class="line"></div>
        </div>
        <div class="signature">
          <span>Il Custode</span>
          <div class="line"></div>
        </div>
      </div>
    </div>
  `,
});

export async function printReleaseDocument(
  payload: ReleasePrintPayload
): Promise<void> {
  const origin = globalThis.location?.origin ?? '';
  const { head, body } = buildReleaseMarkup(payload, origin);
  const html = `<!DOCTYPE html><html lang="it"><head>${head}</head><body>${body}</body></html>`;
  await printHtmlInline(html, { printDelayMs: 200 });
}

