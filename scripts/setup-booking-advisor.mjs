import PocketBase from 'pocketbase';

// Read-only by default; --apply adds the optional field. Existing notes are untouched.
const { POCKETBASE_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD } = process.env;
if (!POCKETBASE_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
  throw new Error('Set POCKETBASE_URL, PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD');
}
const pb = new PocketBase(POCKETBASE_URL);
try {
  await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  const collection = await pb.collections.getOne('bookings');
  const key = Array.isArray(collection.fields) ? 'fields' : 'schema';
  const fields = collection[key];
  if (!Array.isArray(fields)) throw new Error('Unknown collection schema');
  const existing = fields.find((field) => field.name === 'advisorName');
  if (existing && existing.type !== 'text') throw new Error('advisorName exists with an incompatible type');
  if (existing) {
    console.log('bookings.advisorName already exists');
  } else if (!process.argv.includes('--apply')) {
    console.log('Would add optional advisorName text field (max 100). Use --apply to save.');
  } else {
    const options = { min: 0, max: 100, pattern: '' };
    fields.push({ name: 'advisorName', type: 'text', required: false, ...(key === 'fields' ? options : { options }) });
    await pb.collections.update(collection.id, { [key]: fields });
    const verified = await pb.collections.getOne(collection.id);
    if (!verified[key].some((field) => field.name === 'advisorName' && field.type === 'text')) {
      throw new Error('Schema verification failed');
    }
    console.log('Verified bookings.advisorName');
  }
} finally {
  pb.authStore.clear();
}
