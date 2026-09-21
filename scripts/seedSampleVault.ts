import { writeVault, DEFAULT_VAULT, readVault } from '../server/vault.mjs';
import { SAMPLE_SNAPSHOT } from '../src/data/sampleVault';

async function main() {
  console.log('Target vault:', DEFAULT_VAULT);
  await writeVault(DEFAULT_VAULT, SAMPLE_SNAPSHOT);
  const verify = await readVault(DEFAULT_VAULT);
  console.log('Seeded successfully!');
  console.log(Object.fromEntries(Object.entries(verify).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])));
}

main().catch(err => {
  console.error('Error seeding sample vault:', err);
  process.exit(1);
});
