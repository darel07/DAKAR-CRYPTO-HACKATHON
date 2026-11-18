import { useMemo, useState } from "react";
import { Alert, Button, EmptyState } from "../components/ui";
import { QrCode } from "../components/QrCode";
import { formatFcfa } from "../lib/domain/format";
import { useVentes } from "../lib/domain/ventesStore";
import { construireContenu, encoder, signerPasseport, verifier } from "../lib/nostr/passeport";

const PERIODES = [7, 30, 90] as const;
/** Au-delà, un QR devient trop dense pour être scanné de façon fiable avec un téléphone d'entrée de gamme. */
const LIMITE_QR = 1800;

export function Passeport() {
  const ventes = useVentes();
  const [jours, setJours] = useState<number>(30);
  const [lien, setLien] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  const apercu = useMemo(() => verifier(signerPasseport(construireContenu(ventes, jours))), [ventes, jours]);
  const total = apercu.totalProuve + apercu.totalDeclare;

  const generer = async () => {
    setErreur(null); setCopie(false);
    try {
      const charge = await encoder(signerPasseport(construireContenu(ventes, jours)));
      setLien(`${window.location.origin}${window.location.pathname}#/preteur/${charge}`);
    } catch {
      setErreur("Impossible de générer le passeport sur cet appareil. Mettez à jour votre navigateur.");
    }
  };

  const copier = async () => {
    if (!lien) return;
    try { await navigator.clipboard.writeText(lien); setCopie(true); } catch { setErreur("Copie impossible. Sélectionnez le lien à la main."); }
  };

  if (ventes.length === 0) {
    return (
      <>
        <header className="page-titre"><h1>Mon passeport</h1></header>
        <EmptyState titre="Pas encore de ventes">Enregistrez quelques ventes : votre passeport de revenus se construit à partir d'elles.</EmptyState>
      </>
    );
  }

  return (
    <>
      <header className="page-titre">
        <h1>Mon passeport</h1>
        <p>Une preuve de vos revenus, que l'agent de microfinance peut vérifier lui-même.</p>
      </header>

      <div className="segments" role="group" aria-label="Période">
        {PERIODES.map((p) => (
          <Button key={p} variante={p === jours ? "primaire" : "secondaire"} aria-pressed={p === jours}
            onClick={() => { setJours(p); setLien(null); }}>{p} jours</Button>
        ))}
      </div>

      <div className="chiffre-cle">
        <span className="chiffre-cle__valeur">{formatFcfa(total)}</span>
        <span className="chiffre-cle__libelle">
          dont {formatFcfa(apercu.totalProuve)} prouvés ({apercu.nbProuvees}) et {formatFcfa(apercu.totalDeclare)} déclarés ({apercu.nbDeclarees})
        </span>
      </div>

      {total === 0 && <Alert niveau="info">Aucune vente sur cette période.</Alert>}
      {erreur && <Alert niveau="erreur">{erreur}</Alert>}

      <Button grand bloc onClick={generer} disabled={total === 0}>Générer mon passeport</Button>

      {lien && (
        <section className="rubrique" aria-live="polite">
          <Alert niveau="succes" titre="Passeport signé">Montrez le code ou envoyez le lien à l'agent de microfinance.</Alert>
          {lien.length <= LIMITE_QR
            ? <div className="qr"><QrCode valeur={lien} alt="Code QR du passeport de revenus" /></div>
            : <Alert niveau="info">Votre passeport est trop détaillé pour un code QR. Envoyez le lien.</Alert>}
          <p className="lien-partage">{lien}</p>
          <Button variante="secondaire" bloc onClick={copier}>{copie ? "Lien copié" : "Copier le lien"}</Button>
        </section>
      )}
    </>
  );
}
