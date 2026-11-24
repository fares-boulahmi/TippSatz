import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Link, useParams } from "react-router";
import api, { errMsg } from "../api/client.js";
import Icon from "../components/Icon.jsx";
import Spinner from "../components/Spinner.jsx";
import ResultCard from "../components/typing/ResultCard.jsx";
import TypingTest from "../components/typing/TypingTest.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { localISO } from "../utils/dates.js";
import { toTokens } from "../utils/text.js";

export default function PracticePage() {
  const [collectionId, setCollectionId] = useState(null);
  const [session, setSession] = useState(null); // what the server says I should type now
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // stats of the session I just finished
  const [next, setNext] = useState(null); // the following session (arrives after saving)
  const [saveError, setSaveError] = useState("");
  const [showTyped, setShowTyped] = useState(false); // hidden by default
  const payload = useRef(null);
  const { user } = useAuth();
  const id = useParams().id || null;

  useEffect(() => {
    if (id !== null) {
      api
        .get(`/progress/${id}/session`)
        .then((r) => {
          setCollectionId(id);
          setSession(r.data);
        })
        .catch((e) => setError(errMsg(e)));
    } else {
      api.get(`/progress/lastActivity`).then((r) => {
        setCollectionId(r.data.collection);
        api
          .get(`/progress/${r.data.collection}/session`)
          .then((r) => setSession(r.data))
          .catch((e) => setError(errMsg(e)));
      });
    }
  }, [id]);

  const tokens = useMemo(
    () => (session && !session.completed ? toTokens(session) : []),
    [session],
  );

  // Save progress right when the session is finished (not when "Next" is clicked),
  // so closing the tab on the result screen never loses it.
  const save = useCallback(async () => {
    setSaveError("");
    try {
      const { data } = await api.post(
        `/progress/${collectionId}/complete`,
        payload.current,
      );
      setNext(data);
    } catch (e) {
      if (e.response?.status === 409 && e.response.data.session)
        setNext(e.response.data.session); // out of sync -> resync
      else setSaveError(errMsg(e));
    }
  }, [collectionId]);

  const onFinish = useCallback(
    (stats) => {
      payload.current = {
        mode: session.mode,
        index: session.index,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        chars: stats.chars.correct,
        wordCount: tokens.length,
        date: localISO(),
      };
      setResult(stats);
      setNext(null);
      setShowTyped(false);
      save();
    },
    [session, tokens, save],
  );

  const goNext = useCallback(() => {
    setSession(next);
    setResult(null);
    setShowTyped(false);
    setNext(null);
  }, [next]);

  // Skip the words
  const skipWords = useCallback(async () => {
    if (!session || session.mode !== "words") return;

    const { total, size } = session;
    // start index of the very last chunk of words
    const lastIndex = total <= size ? 0 : Math.floor((total - 1) / size) * size;

    const skipPayload = {
      mode: "words",
      index: lastIndex,
      wpm: 0,
      accuracy: 0,
      chars: 0,
      wordCount: 0,
      skip: true,
      date: localISO(),
    };

    try {
      const { data } = await api.post(
        `/progress/${collectionId}/complete`,
        skipPayload,
      );
      setSession(data);
      setResult(null);
      setNext(null);
      setSaveError("");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [session, collectionId]);

  const handleBadgeClick = useCallback(() => {
    if (result || !session || session.mode !== "words") return;

    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">
            Are you sure you want to skip the words and go to sentences?
          </span>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                toast.dismiss(t.id);
                skipWords();
              }}
            >
              Yes, skip
            </button>
            <button className="btn btn-sm" onClick={() => toast.dismiss(t.id)}>
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  }, [result, session, skipWords]);

  // Shows what the user typed, coloured per character:
  // green = correct, red = wrong or extra, grey = missed
  // Same look as the typing test, read-only, showing everything the user typed
  function TypedReview({ tokens, typed = [] }) {
    return (
      <div className="typing-area">
        <div className="typing-inner">
          {tokens.map((tok, i) => {
            const target = tok.target;
            const input = typed[i] ?? "";
            const wrong = input !== target;
            const len = Math.max(target.length, input.length);

            return (
              <div key={i} className={`tw ${wrong ? "tw-wrong" : ""}`}>
                <span className="tl-letters">
                  {Array.from({ length: len }, (_, j) => {
                    const ch = j < target.length ? target[j] : input[j];
                    let cls = "tl-untyped";
                    if (j < input.length)
                      cls =
                        j >= target.length
                          ? "tl-extra"
                          : input[j] === target[j]
                            ? "tl-correct"
                            : "tl-wrong";
                    return (
                      <span key={j} className={cls}>
                        {ch === " " ? "\u00A0" : ch}
                      </span>
                    );
                  })}
                </span>
                {tok.hint && <span className="tl-hint">{tok.hint}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div role="alert" className="alert alert-error">
          {error}
        </div>
        <Link to={`/collections/${collectionId}`} className="btn btn-sm">
          Back to collection
        </Link>
      </div>
    );
  }

  if (!session) return <Spinner />;

  // ── whole collection finished ──
  if (session.completed) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-10 md:p-14 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-primary mb-6">
          <Icon name="task_alt" className="!text-3xl" />
        </div>
        <h1 className="font-headline text-5xl mb-4">Collection complete.</h1>
        <p className="text-base-content/70 mb-8">
          You went through every set of “{session.collection.title}”. If new
          sets get added later, continue here and you will pick up right after
          the last one.
        </p>
        <div className="flex gap-3">
          <Link to={`/collections/${collectionId}`} className="btn">
            View sets
          </Link>
          <Link to="/" className="btn btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { mode, index, size, total, set, collection } = session;
  const to = Math.min(index + size, total);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Toaster position="top-right" />
        {user.role === "admin" && (
          <div>
            <Link
              to={`/collections/${collectionId}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              ← {collection.title}
            </Link>
            <h1 className="font-headline text-3xl mt-1">
              {set.title || `Set ${set.position}`}
            </h1>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="badge badge-ghost">
            Set {set.position}/{collection.setsCount}
          </span>
          {/* <span
            className={`badge ${mode === "words" ? "badge-primary" : "badge-accent"}`}
          >
            {mode}
          </span> */}
          {mode === "words" && !result ? (
            <button
              type="button"
              className="badge badge-primary cursor-pointer"
              onClick={handleBadgeClick}
            >
              {mode}
            </button>
          ) : (
            <span
              className={`badge ${mode === "words" ? "badge-primary" : "badge-accent"}`}
            >
              {mode}
            </span>
          )}
          <span className="badge badge-ghost">
            {index + 1}–{to} of {total}
          </span>
        </div>
      </header>

      <progress
        className="progress progress-primary w-full h-1"
        value={index}
        max={total}
      />

      <section className="bg-white rounded-xl shadow-sm p-6 sm:p-10 min-h-[22rem]">
        {result ? (
          <ResultCard
            result={result}
            total={tokens.length}
            saving={!next && !saveError}
            saveError={saveError}
            onRetrySave={save}
            onNext={goNext}
          />
        ) : (
          // key = a fresh typing test for every new chunk
          <TypingTest
            key={`${set.id}-${mode}-${index}`}
            tokens={tokens}
            onFinish={onFinish}
          />
        )}
      </section>

      {result && (
        <section className="bg-white rounded-xl shadow-sm p-6 sm:p-10 space-y-4">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setShowTyped((v) => !v)}
          >
            <Icon name={showTyped ? "visibility_off" : "visibility"} />
            {showTyped ? "Hide what I typed" : "Show what I typed"}
          </button>

          {showTyped && (
            <div className="typing-review">
              <TypedReview tokens={tokens} typed={result.typed} />
            </div>
          )}
        </section>
      )}

      {!result && mode === "words" && (
        <p className="text-sm text-base-content/60">
          Type the word on the left. The{" "}
          <span className="text-primary italic">coloured text</span> next to it
          is just its translation.
        </p>
      )}
    </div>
  );
}
