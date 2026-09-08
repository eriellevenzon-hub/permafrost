# Keeping the vocabulary current

The risk to this archive was never too few words. It is the entries going
quietly stale — a definition that stopped being true, an example from a
process nobody runs any more. Nobody notices, because **a wrong
definition looks exactly like a right one**.

Everything below exists to make that noticeable.

---

## Two things that look like one

**Flagging is safe.** Anyone can say "this looks wrong". It costs one
click, needs no login, and changes nothing on its own.

**Adding is not.** The tool's whole claim is that Frost named these and
Simone does not improvise. Open contribution turns it into what people
*think* the words mean — the thing it was built to replace.

So: suggestions wide open, publication gated.

---

## Three states

Every term carries a `status`. Absent means `canon`, so nothing has to
change for the 74 that exist today.

| status | what it means | how it answers |
|---|---|---|
| `canon` | reviewed, settled | plainly, as now |
| `proposed` | in use, not yet settled | answers, and says it is not settled |
| `retired` | no longer used | still answers, and says what replaced it |

**Retire, never delete.** A slug is a URL somebody pasted into Chat a
year ago. Deleting a term breaks that link silently — the reader lands on
the archive with nothing open and no idea why.

---

## Who decides

Not Design Ops. Ops does not speak this language daily, and it has an
incentive to *standardise* the vocabulary where the archive's job is to
*record* what people actually say. Those pull in opposite directions.

**Edits to an existing term — the person quoted in it.**
Every entry stores `saidBy`. They said it; they know whether it has
changed. One message a quarter, and no new structure. If they have left,
it falls to their discipline's lead.

**New terms — a custodian, rotating quarterly.**
One designer, fifteen minutes a week, then it passes on. Rotating stops a
bottleneck forming around one person, and it teaches the vocabulary to
whoever holds it — the same reason the tool works for onboarding.

**Canonisation — the CCO, in a batch.**
Not per term. Once a quarter the custodian brings the `proposed` list and
JP marks each one canon, retired, or not ours. Thirty minutes. Naming
authority stays where it already sits without making him a queue.

---

## The loop

- **Anytime** — anyone flags or proposes, from either product.
- **Weekly, 15 min** — the custodian triages: obvious fixes applied,
  edits routed to whoever is quoted, new words marked `proposed`.
- **Quarterly, 30 min** — the CCO promotes, retires or rejects.

**Anything `proposed` for two quarters is retired unless someone argues
for it.** Without that rule the list becomes a graveyard of half-real
terms, which erodes the authority the gate was meant to protect.

---

## What is built

**"Out of date?"** sits on every term, in the panel and on the site. It
opens a prefilled form carrying the term and its slug.

**"Propose this term"** appears on a dead end — the moment someone has
just proven a word is missing is the best moment to catch it.

**The gap log** is the part to actually read. Every dead end is recorded
locally, counted and ranked, in the user's own Figma storage. Nothing
leaves the machine. It turns the custodian's job from waiting for
volunteers into reviewing a list of what people looked for and did not
find.

Set both URLs at build time:

```
node build.js <permafrost-url> <suggest-url>
```

and `SUGGEST_URL` near the top of the site's `App.jsx`.

---

## Growing it up

**Now** — a Google Form. An afternoon's work. If nobody uses it in a
month, you have learned that cheaply and built nothing.

**If they do** — a GitHub issue template. The vocabulary is already a
file in a repo, so a suggestion becomes a pull request and approval is a
merge. Free history, free attribution, free rollback.

**Only if volume justifies it** — proposing from inside Simone, without
the trip out to a form.

---

## Adding or changing a term

Edit `permafrost/src/vocabulary.js`, then:

```
cd permafrost && npm run build
cd ../simone-plugin && node sync.js ../permafrost
```

Add `status: "proposed"` for anything not yet through the quarterly pass.
Slugs are permanent — add freely, never rename.
