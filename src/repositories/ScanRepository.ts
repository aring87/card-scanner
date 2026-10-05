import type { SqlDatabase } from '@/db/types';
import {
  CaptureRequestSchema,
  CardScanSchema,
  DetectedCardIdentitySchema,
  RecognitionCandidateSchema,
  ScanCorrectionSchema,
  SerialNumberSchema,
  type CardScan,
  type ScanCorrection,
} from '@/models';
import { parseJsonColumn, toJson } from '@/utils/json';

export type ScanRow = {
  id: string;
  created_at: string;
  product_id: string | null;
  front_image_uri: string | null;
  back_image_uri: string | null;
  tilt_capture_uri: string | null;
  detected_identity: string;
  detected_variation: string | null;
  detected_variation_id: string | null;
  serial_number: string | null;
  confidence: number;
  evidence: string;
  alternatives: string;
  capture_requests: string;
  recognition_mode: string;
  is_simulated: number;
  user_confirmed: number;
  user_corrected: number;
  correction: string | null;
};

const EvidenceListSchema = CardScanSchema.shape.evidence;

export function rowToScan(row: ScanRow): CardScan {
  return CardScanSchema.parse({
    id: row.id,
    createdAt: row.created_at,
    frontImageUri: row.front_image_uri,
    backImageUri: row.back_image_uri,
    tiltCaptureUri: row.tilt_capture_uri,
    detectedIdentity: parseJsonColumn(DetectedCardIdentitySchema, row.detected_identity, 'detected_identity'),
    detectedVariation: parseJsonColumn(
      RecognitionCandidateSchema.nullable(),
      row.detected_variation,
      'detected_variation',
    ),
    serialNumber: parseJsonColumn(SerialNumberSchema.nullable(), row.serial_number, 'serial_number'),
    confidence: row.confidence,
    evidence: parseJsonColumn(EvidenceListSchema, row.evidence, 'evidence'),
    alternatives: parseJsonColumn(RecognitionCandidateSchema.array(), row.alternatives, 'alternatives'),
    captureRequests: parseJsonColumn(CaptureRequestSchema.array(), row.capture_requests, 'capture_requests'),
    recognitionMode: row.recognition_mode,
    isSimulated: row.is_simulated === 1,
    userConfirmed: row.user_confirmed === 1,
    userCorrected: row.user_corrected === 1,
    correction: parseJsonColumn(ScanCorrectionSchema.nullable(), row.correction, 'correction'),
  });
}

export class ScanRepository {
  constructor(private readonly db: SqlDatabase) {}

  async create(scan: CardScan): Promise<CardScan> {
    const s = CardScanSchema.parse(scan);
    await this.db.runAsync(
      `INSERT INTO scans (id, created_at, product_id, front_image_uri, back_image_uri, tilt_capture_uri,
        detected_identity, detected_variation, detected_variation_id, serial_number, confidence, evidence,
        alternatives, capture_requests, recognition_mode, is_simulated, user_confirmed, user_corrected, correction)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.createdAt,
        s.detectedIdentity.productId ?? null,
        s.frontImageUri,
        s.backImageUri,
        s.tiltCaptureUri ?? null,
        toJson(s.detectedIdentity),
        s.detectedVariation ? toJson(s.detectedVariation) : null,
        s.detectedVariation?.variationId ?? null,
        s.serialNumber ? toJson(s.serialNumber) : null,
        s.confidence,
        toJson(s.evidence),
        toJson(s.alternatives),
        toJson(s.captureRequests),
        s.recognitionMode,
        s.isSimulated ? 1 : 0,
        s.userConfirmed ? 1 : 0,
        s.userCorrected ? 1 : 0,
        s.correction ? toJson(s.correction) : null,
      ],
    );
    return s;
  }

  async getById(id: string): Promise<CardScan | null> {
    const row = await this.db.getFirstAsync<ScanRow>('SELECT * FROM scans WHERE id = ?', [id]);
    return row ? rowToScan(row) : null;
  }

  /** Newest first. */
  async list({ limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<CardScan[]> {
    const rows = await this.db.getAllAsync<ScanRow>(
      'SELECT * FROM scans ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );
    return rows.map(rowToScan);
  }

  async count(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM scans');
    return row?.n ?? 0;
  }

  async markConfirmed(id: string): Promise<void> {
    await this.db.runAsync('UPDATE scans SET user_confirmed = 1 WHERE id = ?', [id]);
  }

  /** Records a correction next to the original prediction (which is preserved for evaluation). */
  async applyCorrection(id: string, correction: ScanCorrection): Promise<void> {
    const c = ScanCorrectionSchema.parse(correction);
    await this.db.runAsync(
      'UPDATE scans SET correction = ?, user_corrected = 1, user_confirmed = 1 WHERE id = ?',
      [toJson(c), id],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM scans WHERE id = ?', [id]);
  }
}
