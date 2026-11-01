import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ==========================================
// Types
// ==========================================

export interface KentaaConfig {
  projectId: string;   // ex: "o8d7k7rET7G9"
  segmentId: string;   // ex: "iaGBa3eixN51"
  siteId: string;      // ex: "fw89n4DZrNBw"  (header X-Site-Id)
  siteUrl: string;     // ex: "https://lpcc.pagefondationdefrance.org"
  locale?: string;     // défaut: "fr"
}

export interface DonationEntity {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  public_url: string;
  title: string;
  type: string;
  visible: boolean;
}

export interface Donation {
  id: string;
  created_at: string;
  updated_at: string;
  amount: string;
  currency: string;
  entity: DonationEntity;
  message?: string;
  name: string;
  tags: string[];
}

export interface KentaaResponse {
  data: Donation[];
  links: {
    self: string;
    next?: string;
  };
}

// ==========================================
// Requête HTTP bas niveau (node:https)
//
// On évite fetch() : undici supprime silencieusement les en-têtes
// interdits (Host, Origin, Referer), et surtout l'API Kentaa exige
// les en-têtes X-Site-Id / X-Segment-Id, sans lesquels elle répond
// 400 {"error":"Invalid request."}. node:https ne filtre rien.
// ==========================================

function kentaaGet(url: string, config: KentaaConfig): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Referer': `${config.siteUrl}/`,
        'X-Site-Id': config.siteId,
        'X-Segment-Id': config.segmentId,
        'X-Locale': config.locale ?? 'fr',
        // Optionnel, à retirer si Kentaa ne l'exige pas :
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
      },
    }, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ==========================================
// DonationTracker
// ==========================================

export class DonationTracker {
  private config: KentaaConfig;
  private storageFilePath: string;
  private knownDonationIds: Set<string>;

  constructor(config: KentaaConfig, storageFilePath: string = 'donations.json') {
    this.config = config;
    this.storageFilePath = path.resolve(storageFilePath);
    this.knownDonationIds = new Set<string>();

    this.loadPersistedDonations();
  }

  /**
   * Charge les IDs déjà connus depuis le fichier JSON s'il existe
   */
  private loadPersistedDonations(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const fileContent = fs.readFileSync(this.storageFilePath, 'utf-8');
        const savedDonations: Donation[] = JSON.parse(fileContent);

        for (const donation of savedDonations) {
          this.knownDonationIds.add(donation.id);
        }
        console.log(`📂 [Init] ${this.knownDonationIds.size} dons chargés depuis ${this.storageFilePath}`);
      }
    } catch (error) {
      console.error("⚠️ Erreur lors du chargement du fichier de stockage :", error);
    }
  }

  /**
   * Sauvegarde l'ensemble des dons connus dans le fichier JSON
   */
  private saveDonationsToDisk(donations: Donation[]): void {
    try {
      fs.writeFileSync(this.storageFilePath, JSON.stringify(donations, null, 2), 'utf-8');
    } catch (error) {
      console.error("❌ Erreur lors de l'écriture dans le fichier JSON :", error);
    }
  }

  /**
   * Lit tous les dons actuellement stockés sur le disque
   */
  public getAllStoredDonations(): Donation[] {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const fileContent = fs.readFileSync(this.storageFilePath, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error("⚠️ Erreur lors de la lecture des dons stockés :", error);
    }
    return [];
  }

  /**
   * Interroge l'API Kentaa, détecte les nouveaux dons,
   * les sauvegarde et retourne uniquement ces nouveautés.
   */
  public async update(): Promise<Donation[]> {
    const apiUrl = `https://frontend-api.kentaa.nl/donations?project_id=${this.config.projectId}&segment_id=${this.config.segmentId}`;

    console.log(`🌐 Appel vers : ${apiUrl}`);

    try {
      const { status, body } = await kentaaGet(apiUrl, this.config);

      if (status !== 200) {
        console.error(`🚨 Erreur ${status} :`, body);
        throw new Error(`Erreur HTTP ! Statut : ${status}`);
      }

      const json: KentaaResponse = JSON.parse(body);
      const apiDonations = json.data;

      const brandNewDonations: Donation[] = [];

      for (const donation of apiDonations) {
        if (!this.knownDonationIds.has(donation.id)) {
          this.knownDonationIds.add(donation.id);
          brandNewDonations.push(donation);
        }
      }

      if (brandNewDonations.length > 0) {
        const allStored = this.getAllStoredDonations();
        const updatedStorage = [...brandNewDonations, ...allStored];
        this.saveDonationsToDisk(updatedStorage);
      }

      return brandNewDonations;

    } catch (error) {
      console.error("❌ Erreur lors de l'appel à l'API Kentaa :", error);
      return [];
    }
  }
}