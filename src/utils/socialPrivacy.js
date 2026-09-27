/**
 * Kanonische Regel: Wann sind Plattform-IDs eines Spielers sichtbar?
 *
 * Gilt für alle Profile-Darstellungen (PlayerProfileCard, zukünftige Views …).
 * Nur diese Funktion editieren um die Regel global zu ändern.
 *
 * @param {boolean} isOwnProfile  - Viewer = Profilinhaber
 * @param {boolean} isFriend      - Aktive Freundschaft vorhanden
 * @param {boolean} inSameLobby   - Beide Spieler in derselben Lobby + Timer gestartet
 */
export function socialVisible(isOwnProfile, isFriend, inSameLobby) {
  return isOwnProfile || isFriend || inSameLobby
}
