import { useMemo } from "react";
import QRCode from "qrcode";

interface Matrice {
  /** Côté en modules, marge d'un module comprise. */
  cote: number;
  chemin: string;
}

/** Calcul synchrone : le QR est là dès la première image, aucun délai avant affichage.
 *  Les modules noirs d'une même ligne sont fusionnés en un seul rectangle (SVG léger). */
function calculer(valeur: string): Matrice | null {
  try {
    const { modules } = QRCode.create(valeur, { errorCorrectionLevel: "L" });
    const n = modules.size;
    let chemin = "";
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (!modules.get(y, x)) { x++; continue; }
        const debut = x;
        while (x < n && modules.get(y, x)) x++;
        chemin += `M${debut + 1} ${y + 1}h${x - debut}v1h${debut - x}z`;
      }
    }
    return { cote: n + 2, chemin };
  } catch {
    return null; // contenu trop long pour un QR
  }
}

interface QrCodeProps {
  valeur: string;
  /** Description pour les lecteurs d'écran. */
  label: string;
}

/** QR généré sur le téléphone (aucun service tiers ne voit la facture), noir sur blanc
 *  dans les deux thèmes, correction L, marge d'un module. */
export function QrCode({ valeur, label }: QrCodeProps) {
  const qr = useMemo(() => calculer(valeur), [valeur]);
  if (!qr) return <p className="qr-erreur" role="alert">Ce contenu est trop long pour un code QR.</p>;
  return (
    <svg className="qr-code" viewBox={`0 0 ${qr.cote} ${qr.cote}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect className="qr-code__fond" width={qr.cote} height={qr.cote} />
      <path className="qr-code__modules" d={qr.chemin} />
    </svg>
  );
}

/** QR d'une demande de paiement : préfixe lightning: et facture en MAJUSCULES
 *  (mode alphanumérique du QR, donc moins de modules et un scan plus facile). */
export function PaymentQRCode({ facture }: { facture: string }) {
  return <QrCode valeur={`lightning:${facture.toUpperCase()}`} label="QR code de paiement à présenter au client" />;
}
