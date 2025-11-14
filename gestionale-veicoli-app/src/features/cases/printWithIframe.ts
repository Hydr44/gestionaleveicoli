type PrintOptions = {
  timeoutMs?: number;
  printDelayMs?: number;
};

export function printHtmlInline(
  html: string,
  { timeoutMs = 20000, printDelayMs = 150 }: PrintOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || !document.body || !document.head) {
      reject(new Error('Ambiente non supportato per la stampa.'));
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'print-portal';
    wrapper.innerHTML = html;
    wrapper.style.display = 'none';

    const style = document.createElement('style');
    style.dataset.printPortalStyle = 'true';
    style.textContent = `
      @media print {
        body > *:not(.print-portal) {
          display: none !important;
        }
        .print-portal {
          display: block !important;
        }
      }
      @media screen {
        .print-portal {
          display: none !important;
        }
      }
    `;

    let timeoutHandle: number | null = null;

    const cleanup = () => {
      if (timeoutHandle !== null) {
        globalThis.clearTimeout(timeoutHandle);
      }
      globalThis.removeEventListener('afterprint', handleAfterPrint);
      style.remove();
      wrapper.remove();
    };

    const handleAfterPrint = () => {
      cleanup();
      resolve();
    };

    const handleError = (error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    document.head.appendChild(style);
    document.body.appendChild(wrapper);

    globalThis.addEventListener('afterprint', handleAfterPrint, { once: true });

    timeoutHandle = globalThis.setTimeout(() => {
      handleError(new Error('Stampa non completata (timeout)'));
    }, timeoutMs) as unknown as number;

    globalThis.setTimeout(() => {
      try {
        globalThis.print();
      } catch (error) {
        handleError(error);
      }
    }, printDelayMs);
  });
}

