import { DonationTracker, Donation } from './tracker';

const POLL_MS = 10000; // 10 s

const config = {
  projectId: "o8d7k7rET7G9",
  segmentId: "iaGBa3eixN51",
  siteId: "fw89n4DZrNBw",
  siteUrl: "https://lpcc.pagefondationdefrance.org",
  locale: "fr",
};

function afficherNouveauxDons(dons: Donation[]) {
  for (const don of dons) {
    console.log(`🎁 NOUVEAU DON ! De : ${don.name} | ${don.amount} ${don.currency}`);
    if (don.message) console.log(`💬 "${don.message}"`);
    console.log("----------------------------------------");
  }
}

async function main() {
  console.log("🚀 Démarrage du suivi des dons EPTV x LPCC 2026...");

  const tracker = new DonationTracker(config, "donations.json");

  // 1️⃣ Premier appel immédiat : charge l'historique dans donations.json
  const initialDonations = await tracker.update();
  console.log(`✅ Chargement initial : ${initialDonations.length} don(s)`);

  // 2️⃣ Polling : le prochain appel démarre seulement quand le précédent est fini
  const poll = async () => {
    try {
      const nouveaux = await tracker.update();
      afficherNouveauxDons(nouveaux);
    } catch (e) {
      console.error("Erreur pendant le polling :", e);
    }
    setTimeout(poll, POLL_MS);
  };

  console.log(`👂 Polling actif toutes les ${POLL_MS / 1000} s...`);
  poll();
}

main();