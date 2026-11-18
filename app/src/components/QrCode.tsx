import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR généré localement (aucun service tiers ne voit la facture). Fond blanc forcé
 *  pour rester scannable quel que soit le thème. */
export function QrCode({ valeur, alt }: { valeur: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    QRCode.toDataURL(valeur, { margin: 1, width: 480, errorCorrectionLevel: "L" })
      .then((url) => { if (actif) setSrc(url); })
      .catch(() => { if (actif) setSrc(null); });
    return () => { actif = false; };
  }, [valeur]);
  return <div className="qr__image">{src && <img src={src} alt={alt} />}</div>;
}
