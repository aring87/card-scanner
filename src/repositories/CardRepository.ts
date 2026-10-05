import type { SqlDatabase } from '@/db/types';
import { CardIdentitySchema, type CardIdentity } from '@/models';

type CardRow = {
  id: string;
  product_id: string;
  year: number;
  manufacturer: string;
  product: string;
  set_name: string;
  subset_name: string | null;
  player_name: string;
  team: string | null;
  card_number: string;
  rookie: number;
  sport: string;
};

const toCard = (row: CardRow): CardIdentity =>
  CardIdentitySchema.parse({
    id: row.id,
    year: row.year,
    manufacturer: row.manufacturer,
    product: row.product,
    setName: row.set_name,
    subsetName: row.subset_name,
    playerName: row.player_name,
    team: row.team,
    cardNumber: row.card_number,
    rookie: row.rookie === 1,
    sport: row.sport,
  });

/** Checklist entries (card identities). Empty until the verified checklist is imported (Phase 3). */
export class CardRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listByProduct(productId: string): Promise<CardIdentity[]> {
    const rows = await this.db.getAllAsync<CardRow>(
      'SELECT * FROM cards WHERE product_id = ? ORDER BY card_number',
      [productId],
    );
    return rows.map(toCard);
  }

  async findByNumber(productId: string, cardNumber: string): Promise<CardIdentity[]> {
    const rows = await this.db.getAllAsync<CardRow>(
      'SELECT * FROM cards WHERE product_id = ? AND card_number = ? COLLATE NOCASE',
      [productId, cardNumber],
    );
    return rows.map(toCard);
  }

  async upsert(productId: string, card: CardIdentity): Promise<void> {
    const c = CardIdentitySchema.parse(card);
    await this.db.runAsync(
      `INSERT OR REPLACE INTO cards
        (id, product_id, year, manufacturer, product, set_name, subset_name, player_name, team, card_number, rookie, sport)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        productId,
        c.year,
        c.manufacturer,
        c.product,
        c.setName,
        c.subsetName,
        c.playerName,
        c.team,
        c.cardNumber,
        c.rookie ? 1 : 0,
        c.sport,
      ],
    );
  }

  async count(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM cards');
    return row?.n ?? 0;
  }
}
