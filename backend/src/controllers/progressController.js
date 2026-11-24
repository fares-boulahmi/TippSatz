import { CHUNK_SIZE } from "../config/constants.js";
import Activity from "../models/Activity.js";
import Collection from "../models/Collection.js";
import Progress from "../models/Progress.js";
import TypingSet from "../models/TypingSet.js";
import { HttpError } from "../utils/HttpError.js";
import { buildSession, settle } from "../utils/progressEngine.js";

const loadSet = (id) => TypingSet.findById(id).lean();

async function findCollection(id) {
  const collection = await Collection.findById(id).lean();
  if (!collection) throw new HttpError(404, "Collection not found");
  if (!collection.firstSet)
    throw new HttpError(409, "This collection has no sets yet");
  return collection;
}

async function getOrCreateProgress(userId, collection) {
  return (
    (await Progress.findOne({ user: userId, collectionId: collection._id })) ||
    new Progress({
      user: userId,
      collectionId: collection._id,
      currentSet: collection.firstSet,
    })
  );
}

// Normalise the pointer (skip empty arrays, hop to next set, ...), save it, build the payload.
async function resolveSession(progress, collection) {
  const current = await loadSet(progress.currentSet);
  const { set, done } = await settle(progress, current, loadSet);
  await progress.save();
  return buildSession(collection, progress, set, done);
}

// GET /api/progress/:collectionId/session
export async function getSession(req, res) {
  const collection = await findCollection(req.params.collectionId);
  const progress = await getOrCreateProgress(req.user._id, collection);
  res.json(await resolveSession(progress, collection));
}

const num = (v, max) => Math.min(Math.max(Math.round(Number(v)) || 0, 0), max);

// POST /api/progress/:collectionId/complete
// body: { mode, index, wpm, accuracy, chars, wordCount, date: 'YYYY-MM-DD' }
export async function completeSession(req, res) {
  const collection = await findCollection(req.params.collectionId);
  const progress = await getOrCreateProgress(req.user._id, collection);
  const { mode, index, skip } = req.body;

  // ─── SKIP: jump to the last words chunk so settle() flips to sentences ───
  if (skip === true) {
    // Only valid while the user is still in words mode
    if (progress.completed || progress.mode !== "words" || mode !== "words") {
      throw new HttpError(409, "Progress out of sync", {
        session: await resolveSession(progress, collection),
        collection: collection,
        progress: progress,
      });
    }

    // Compute the last chunk on the SERVER (don't trust the client's index)
    const Set = await TypingSet.findById(progress.currentSet); // Calling the set To get the Actuall Number
    const total = Set.words.length;
    const size = CHUNK_SIZE.words;
    const lastIndex = total <= size ? 0 : Math.floor((total - 1) / size) * size;

    // Land on the last chunk, then advance by one chunk like a normal completion
    progress.index = lastIndex + size;

    // No Activity update: a skip is not a practice session
    return res.json(await resolveSession(progress, collection));
  }

  // Duplicate / stale submit (double click, second tab...) -> tell the client where it really is.
  if (
    progress.completed ||
    progress.mode !== mode ||
    progress.index !== Number(index)
  ) {
    throw new HttpError(409, "Progress out of sync", {
      session: await resolveSession(progress, collection),
    });
  }

  // words: +15, sentences: +3. settle() then decides if we flip to sentences / next set.
  progress.index += CHUNK_SIZE[mode];

  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
    ? req.body.date
    : new Date().toISOString().slice(0, 10);
  await Activity.updateOne(
    { user: req.user._id, date },
    {
      $inc: {
        sessions: 1,
        words: num(req.body.wordCount, 1000),
        chars: num(req.body.chars, 20000),
      },
      $max: { bestWpm: num(req.body.wpm, 400) },
    },
    { upsert: true },
  );

  res.json(await resolveSession(progress, collection));
}

// GET /api/progress/activity  -> roughly the last year, one row per active day
export async function getActivity(req, res) {
  const cutoff = new Date(Date.now() - 370 * 864e5).toISOString().slice(0, 10);
  const activity = await Activity.find({
    user: req.user._id,
    date: { $gte: cutoff },
  })
    .select("date sessions words chars bestWpm -_id")
    .sort({ date: 1 })
    .lean();
  res.json({ activity });
}

// GET /api/progress/lastActivity -> the collection the user touched most recently
export async function getLastActivity(req, res) {
  const progress = await Progress.findOne({ user: req.user._id })
    .select("collectionId -_id")
    .sort({ updatedAt: -1 })
    .lean();
  // if (!progress) throw new HttpError(404, "No activity yet");
  // for now will be hard coded to the first set of the 4075 set
  if (!progress) {
    res.json({ collection: "6afdc4d0a473225e817b25bd" });
  }
  res.json({ collection: progress.collectionId });
}
