/**
 * One-off migration: rewrite stored enum-like values in CONSTANT_CASE.
 *
 *   node --env-file=.env scripts/normalize-constants.mjs
 */
import mongoose from 'mongoose';

const uri =
  process.env.MONGO_URI ||
  'mongodb://localhost:27017/nestwell?replicaSet=rs0&directConnection=true';

const toConstantCase = (value) =>
  String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

/** collection -> fields that hold enum-like values */
const TARGETS = {
  passwordentries: ['category'],
  expenses: ['category'],
  incomes: ['source'],
};

try {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  for (const [collection, fields] of Object.entries(TARGETS)) {
    for (const field of fields) {
      const docs = await db
        .collection(collection)
        .find({ [field]: { $type: 'string' } })
        .project({ [field]: 1 })
        .toArray();

      let changed = 0;
      for (const doc of docs) {
        const next = toConstantCase(doc[field]) || 'OTHER';
        if (next !== doc[field]) {
          await db
            .collection(collection)
            .updateOne({ _id: doc._id }, { $set: { [field]: next } });
          changed += 1;
        }
      }
      console.log(`${collection}.${field}: ${changed} of ${docs.length} updated`);
    }
  }
} finally {
  await mongoose.disconnect();
}
