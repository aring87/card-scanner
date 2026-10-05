import type { SqlDatabase } from '@/db/types';
import { ProductSchema, type Product } from '@/models';

type ProductRow = {
  id: string;
  year: number;
  manufacturer: string;
  name: string;
  sport: string;
  verification_status: string;
  notes: string | null;
};

const toProduct = (row: ProductRow): Product =>
  ProductSchema.parse({
    id: row.id,
    year: row.year,
    manufacturer: row.manufacturer,
    name: row.name,
    sport: row.sport,
    verificationStatus: row.verification_status,
    notes: row.notes,
  });

export class ProductRepository {
  constructor(private readonly db: SqlDatabase) {}

  async list(): Promise<Product[]> {
    const rows = await this.db.getAllAsync<ProductRow>('SELECT * FROM products ORDER BY year DESC, name');
    return rows.map(toProduct);
  }

  async getById(id: string): Promise<Product | null> {
    const row = await this.db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE id = ?', [id]);
    return row ? toProduct(row) : null;
  }

  async insertIfMissing(product: Product): Promise<void> {
    const p = ProductSchema.parse(product);
    await this.db.runAsync(
      `INSERT OR IGNORE INTO products (id, year, manufacturer, name, sport, verification_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.year, p.manufacturer, p.name, p.sport, p.verificationStatus, p.notes],
    );
  }
}
