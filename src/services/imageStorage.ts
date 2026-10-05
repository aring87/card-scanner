import { Directory, File, Paths } from 'expo-file-system';

/*
 * Captured photos start in the camera's cache directory, which the OS may purge. Before a scan is
 * saved we copy them into the app's document directory. We store a *relative* reference
 * (`doc:scans/<id>/front.jpg`) rather than an absolute path because absolute container paths can
 * change between app updates on iOS.
 */

const DOC_PREFIX = 'doc:';
const SCANS_DIR = 'scans';

export type ImageSide = 'front' | 'back' | 'tilt';

/** Copies a captured image into permanent storage and returns its stored reference. */
export async function persistScanImage(scanId: string, side: ImageSide, sourceUri: string): Promise<string> {
  const dir = new Directory(Paths.document, SCANS_DIR, scanId);
  dir.create({ intermediates: true, idempotent: true });
  const destination = new File(dir, `${side}.jpg`);
  if (destination.exists) destination.delete();
  await new File(sourceUri).copy(destination);
  return `${DOC_PREFIX}${SCANS_DIR}/${scanId}/${side}.jpg`;
}

/** Converts a stored reference into a URI that <Image> can load. Passes absolute URIs through. */
export function resolveImageUri(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(DOC_PREFIX)) return stored;
  return new File(Paths.document, stored.slice(DOC_PREFIX.length)).uri;
}

export function deleteScanImages(scanId: string): void {
  const dir = new Directory(Paths.document, SCANS_DIR, scanId);
  if (dir.exists) dir.delete();
}
