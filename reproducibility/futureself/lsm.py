"""
lsm.py — Linguistic Style Matching between the student and the future-self bot.

Implements the matching index of Ireland & Pennebaker (2010): for each of nine
standard function-word categories, style matching is

    LSM_cat = 1 - |p_user - p_bot| / (p_user + p_bot + 0.0001)

where p is the percentage of a speaker's words that fall in that category. The
session-level LSM is the mean of the nine category scores; an arm-level LSM is
the mean over its sessions. The function-word lists below are assembled from the
public LIWC function-word categories (the categories Ireland & Pennebaker use);
LIWC itself is proprietary, so this is a faithful open re-implementation rather
than a call to LIWC. The substantive finding (the two arms match nearly
identically) is robust to the exact list.
"""
from __future__ import annotations
import re
import numpy as np
from scipy import stats as sps

# --- nine function-word categories ----------------------------------------- #
PERSONAL_PRONOUNS = {
    "i", "me", "my", "mine", "myself", "we", "us", "our", "ours", "ourselves",
    "you", "your", "yours", "yourself", "yourselves", "u", "ur",
    "he", "him", "his", "himself", "she", "her", "hers", "herself",
    "they", "them", "their", "theirs", "themselves",
}
IMPERSONAL_PRONOUNS = {
    "it", "its", "itself", "this", "that", "these", "those", "which", "who",
    "whom", "whose", "what", "whatever", "whichever", "anybody", "anyone",
    "anything", "everybody", "everyone", "everything", "nobody", "no one",
    "nothing", "somebody", "someone", "something", "one", "ones", "oneself",
}
ARTICLES = {"a", "an", "the"}
CONJUNCTIONS = {
    "and", "but", "or", "nor", "so", "for", "yet", "because", "as", "since",
    "unless", "although", "though", "while", "whereas", "whether", "if", "then",
    "than", "that", "once", "until", "till", "when", "whenever", "where",
    "wherever", "before", "after",
}
PREPOSITIONS = {
    "in", "on", "at", "to", "from", "with", "without", "by", "for", "of",
    "about", "against", "between", "into", "through", "during", "before",
    "after", "above", "below", "under", "over", "around", "among", "across",
    "behind", "beyond", "near", "off", "onto", "upon", "within", "toward",
    "towards", "out", "up", "down", "along", "past", "per", "via",
}
AUXILIARY_VERBS = {
    "am", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "having", "do", "does", "did", "doing", "will", "would", "shall",
    "should", "can", "could", "may", "might", "must", "ought",
    "'m", "'re", "'s", "'ve", "'d", "'ll",
}
ADVERBS = {
    "very", "really", "just", "so", "too", "then", "now", "here", "there",
    "well", "also", "even", "still", "again", "always", "often", "sometimes",
    "usually", "quite", "rather", "almost", "already", "actually", "maybe",
    "perhaps", "probably", "honestly", "literally", "basically", "kind",
    "sort", "pretty", "much", "back", "away", "around", "ever",
}
NEGATIONS = {
    "no", "not", "never", "none", "nobody", "nothing", "neither", "nor",
    "nowhere", "n't", "cannot", "without", "dont", "doesnt", "didnt", "wont",
    "cant", "couldnt", "wouldnt", "shouldnt", "isnt", "arent", "wasnt", "werent",
}
QUANTIFIERS = {
    "all", "some", "any", "many", "much", "few", "little", "more", "most",
    "less", "least", "several", "enough", "both", "each", "every", "lot",
    "lots", "plenty", "couple", "bunch", "half", "whole", "numerous",
}
CATEGORIES = {
    "ppron": PERSONAL_PRONOUNS, "ipron": IMPERSONAL_PRONOUNS, "article": ARTICLES,
    "conj": CONJUNCTIONS, "prep": PREPOSITIONS, "auxverb": AUXILIARY_VERBS,
    "adverb": ADVERBS, "negation": NEGATIONS, "quant": QUANTIFIERS,
}

_TOKEN = re.compile(r"[a-z']+|n't")


def _tokenize(text):
    text = (text or "").lower().replace("’", "'")
    # split n't off contractions so negation/auxiliary get counted
    text = re.sub(r"n't\b", " n't", text)
    return _TOKEN.findall(text)


def _category_pct(tokens):
    n = len(tokens)
    if n == 0:
        return None
    pct = {}
    for cat, words in CATEGORIES.items():
        c = sum(1 for t in tokens if t in words)
        pct[cat] = 100.0 * c / n
    return pct


def session_lsm(study):
    """LSM between the student and the future-self bot across the role-play.

    Honours a precomputed value (phaseC._lsm) when the bundled snapshot ships
    derived metrics instead of raw transcript text (public-repo privacy posture).
    """
    pc = study.get("phaseC") or {}
    if isinstance(pc.get("_lsm"), (int, float)):
        return float(pc["_lsm"])
    t = pc.get("transcript") or []
    # In the role-play transcript the student is role "user"; the future-self bot
    # is role "future" (a.k.a. "assistant" in the flattened messages table).
    user = " ".join(m.get("text", "") for m in t if (m or {}).get("role") == "user")
    bot = " ".join(m.get("text", "") for m in t if (m or {}).get("role") not in ("user", None))
    pu, pb = _category_pct(_tokenize(user)), _category_pct(_tokenize(bot))
    if pu is None or pb is None:
        return None
    scores = []
    for cat in CATEGORIES:
        a, b = pu[cat], pb[cat]
        scores.append(1 - abs(a - b) / (a + b + 0.0001))
    return float(np.mean(scores))


def lsm_by_arm(sample):
    rows = {"integrated": [], "baseline": []}
    for s in sample:
        v = session_lsm(s)
        if v is not None and s.get("_arm") in rows:
            rows[s["_arm"]].append(v)
    i, b = np.array(rows["integrated"]), np.array(rows["baseline"])
    sp = np.sqrt(((len(i) - 1) * i.var(ddof=1) + (len(b) - 1) * b.var(ddof=1)) / (len(i) + len(b) - 2))
    d = (i.mean() - b.mean()) / sp if sp > 0 else float("nan")
    p = float(sps.ttest_ind(i, b, equal_var=False).pvalue)
    return {"integrated_mean": float(i.mean()), "baseline_mean": float(b.mean()),
            "integrated_n": len(i), "baseline_n": len(b),
            "d": float(d), "p": p,
            "integrated_vals": i.tolist(), "baseline_vals": b.tolist()}
