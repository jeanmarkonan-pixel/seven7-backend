/**
 * Détection du type réel d'un fichier par ses octets magiques, indépendante
 * du Content-Type déclaré par le client — un attaquant peut nommer un
 * exécutable "facture.pdf" et fixer le Content-Type qu'il veut, l'en-tête
 * binaire du fichier ne ment pas. Plan de conformité §4.3 ("File Upload :
 * Validation type + taille + scan AV — Magic bytes check + ClamAV").
 *
 * Implémenté à la main plutôt qu'avec une librairie de détection : le
 * périmètre est restreint aux formats réellement admis pour des pièces
 * d'audit, et un allowlist fermé, explicite et vérifiable ici vaut mieux
 * qu'une dépendance qui reconnaît des centaines de formats non pertinents.
 *
 * Le scan antivirus (ClamAV) n'est PAS implémenté : il exige un démon
 * externe absent de cet environnement — non couvert par cette fonction.
 */

export interface DetectedType {
  mime: string;
  extension: string;
}

const SIGNATURES: Array<{ mime: string; extension: string; match: (b: Buffer) => boolean }> = [
  { mime: 'application/pdf', extension: 'pdf', match: (b) => b.subarray(0, 4).toString('latin1') === '%PDF' },
  {
    mime: 'image/png',
    extension: 'png',
    match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/jpeg',
    extension: 'jpg',
    match: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/tiff',
    extension: 'tiff',
    match: (b) =>
      b.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) ||
      b.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a])),
  },
  {
    // DOCX/XLSX sont des ZIP — on ne distingue pas leur sous-type ici, on se
    // fie au typeDocumentCode déclaré par l'appelant pour l'étiquette métier.
    mime: 'application/zip',
    extension: 'zip',
    match: (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  },
];

export function detectMagicBytes(buffer: Buffer): DetectedType | null {
  for (const sig of SIGNATURES) {
    if (sig.match(buffer)) {
      return { mime: sig.mime, extension: sig.extension };
    }
  }
  return null;
}
