# Come compilare per Windows

## Opzione 1: GitHub Actions (Consigliata) ⭐

La soluzione più semplice e affidabile è usare GitHub Actions.

### Passaggi:

1. **Fai push del codice su GitHub** (se non l'hai già fatto):
   ```bash
   git add .
   git commit -m "Preparazione build Windows"
   git push origin main
   ```

2. **Vai su GitHub** → Il tuo repository → **Actions**

3. **Seleziona "Build Windows"** nel menu a sinistra

4. **Clicca "Run workflow"** → **Run workflow**

5. **Attendi la compilazione** (circa 10-15 minuti)

6. **Scarica i file** dalla sezione **Artifacts**:
   - `windows-installer` → File `.msi`
   - `windows-nsis-installer` → File `.exe`

### Configurazione segreti (se necessario):

Se l'app richiede variabili d'ambiente, aggiungile in:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Opzione 2: Compilazione locale su Windows

Se hai accesso a una macchina Windows:

```bash
# Installa Node.js e Rust
# Poi:
cd gestionale-veicoli-app
npm install
npm run tauri:build
```

I file saranno in:
- `src-tauri/target/release/bundle/msi/` → Installer `.msi`
- `src-tauri/target/release/bundle/nsis/` → Installer `.exe`

---

## Opzione 3: Cross-compilation da macOS (Complessa)

La cross-compilation da macOS a Windows è molto complessa e richiede:
- Windows SDK headers
- Compilatore C per Windows
- Configurazione complessa

**Non consigliata** - Usa GitHub Actions invece.

---

## File compilati per macOS

Dopo `npm run tauri:build` su macOS:

- **App**: `src-tauri/target/release/bundle/macos/Gestionale Veicoli.app`
- **Installer**: `src-tauri/target/release/bundle/dmg/Gestionale Veicoli_0.1.0_aarch64.dmg`

