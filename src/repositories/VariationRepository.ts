import type { SqlDatabase, SqlValue } from '@/db/types';
import {
  CardVariationSchema,
  IdentificationRuleSchema,
  VisualSignatureSchema,
  type CardVariation,
} from '@/models';
import { parseJsonColumn, toJson } from '@/utils/json';

type VariationRow = {
  id: string;
  product_id: string;
  name: string;
  category: string;
  serial_numbered: number | null;
  print_run: number | null;
  color: string | null;
  foil_type: string | null;
  texture_type: string | null;
  exclusivity: string | null;
  visual_signatures: string;
  identification_rules: string;
  verification_status: string;
  source: string | null;
  notes: string | null;
  sort_order: number;
};

const toVariation = (row: VariationRow): CardVariation =>
  CardVariationSchema.parse({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    category: row.category,
    serialNumbered: row.serial_numbered === null ? null : row.serial_numbered === 1,
    printRun: row.print_run,
    color: row.color,
    foilType: row.foil_type,
    textureType: row.texture_type,
    exclusivity: row.exclusivity,
    visualSignatures: parseJsonColumn(VisualSignatureSchema.array(), row.visual_signatures, 'visual_signatures'),
    identificationRules: parseJsonColumn(
      IdentificationRuleSchema.array(),
      row.identification_rules,
      'identification_rules',
    ),
    verificationStatus: row.verification_status,
    source: row.source,
    notes: row.notes,
    sortOrder: row.sort_order,
  });

const toParams = (v: CardVariation): SqlValue[] => [
  v.id,
  v.productId,
  v.name,
  v.category,
  v.serialNumbered === null ? null : v.serialNumbered ? 1 : 0,
  v.printRun,
  v.color,
  v.foilType,
  v.textureType,
  v.exclusivity,
  toJson(v.visualSignatures),
  toJson(v.identificationRules),
  v.verificationStatus,
  v.source,
  v.notes,
  v.sortOrder,
];

const COLUMNS = `id, product_id, name, category, serial_numbered, print_run, color, foil_type, texture_type,
  exclusivity, visual_signatures, identification_rules, verification_status, source, notes, sort_order`;
const PLACEHOLDERS = Array(16).fill('?').join(', ');

export class VariationRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listByProduct(productId: string): Promise<CardVariation[]> {
    const rows = await this.db.getAllAsync<VariationRow>(
      'SELECT * FROM variations WHERE product_id = ? ORDER BY sort_order, name',
      [productId],
    );
    return rows.map(toVariation);
  }

  async getById(id: string): Promise<CardVariation | null> {
    const row = await this.db.getFirstAsync<VariationRow>('SELECT * FROM variations WHERE id = ?', [id]);
    return row ? toVariation(row) : null;
  }

  async countByProduct(productId: string): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM variations WHERE product_id = ?',
      [productId],
    );
    return row?.n ?? 0;
  }

  async insertIfMissing(variation: CardVariation): Promise<void> {
    const v = CardVariationSchema.parse(variation);
    await this.db.runAsync(`INSERT OR IGNORE INTO variations (${COLUMNS}) VALUES (${PLACEHOLDERS})`, toParams(v));
  }

  /** Inserts or replaces a variation. Use for verified checklist imports (Phase 3). */
  async upsert(variation: CardVariation): Promise<void> {
    const v = CardVariationSchema.parse(variation);
    if (v.verificationStatus === 'verified' && !v.source) {
      throw new Error(`Variation "${v.name}" cannot be marked verified without a source`);
    }
    await this.db.runAsync(`INSERT OR REPLACE INTO variations (${COLUMNS}) VALUES (${PLACEHOLDERS})`, toParams(v));
  }
}
