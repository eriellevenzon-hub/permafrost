# Publishing the Permafrost on GitHub Pages

The site is already suited to it: `base` is relative and routing is done
with a hash (`#/term/buffer-lane`), so it works under a repo subpath with
no rewrite rules and no 404 fallback.

---

## Once, to set it up

**1. Push the repo.** The workflow watches `main`.

```
git init
git add .
git commit -m "The Permafrost"
git branch -M main
git remote add origin git@github.com:<org>/<repo>.git
git push -u origin main
```

**2. Turn Pages on.** Repository → Settings → Pages → **Source: GitHub
Actions**. Not "Deploy from a branch" — the workflow publishes the built
`dist/`, and a branch deploy would serve the unbuilt source.

**3. Watch the first run** under the Actions tab. It installs, builds,
and deploys. Two minutes or so.

Your URL will be:

```
https://<org>.github.io/<repo>/
```

After that, every push to `main` republishes. There's also a
**Run workflow** button on the Actions tab if you want to republish
without a commit.

---

## The one thing that breaks if you forget it

**The plugin has the old address baked in.** It ships self-contained, so
"The Permafrost" and every "Link to this term" point at whatever URL the
panel was built with — currently the Netlify one.

After the site is live, rebuild the plugin against the new address:

```
cd simone-plugin
node build.js https://<org>.github.io/<repo>/
```

Then re-import the plugin, or re-publish it to the org. Check
`ui.html` afterwards:

```
grep -o 'https://[^"]*' ui.html | head -1
```

There is exactly one occurrence, so if it reads the new address you are
done.

---

## Custom domain

If you point a domain at it later, put the hostname in `public/CNAME`
(one line, no protocol) and set it under Settings → Pages. Then rebuild
the plugin again with that address — the same single URL.

---

## Notes

- **`.nojekyll`** is created during the build. Without it Pages runs the
  artifact through Jekyll, which ignores anything beginning with an
  underscore.
- **Illustrations** are served from `public/illustrations/`, 74 files at
  about 820KB total. They are cached by the browser and are not part of
  the JS bundle.
- **`npm run build` locally** if you want to check the output before
  pushing; `dist/` is gitignored and only the workflow publishes it.
- **The single-file preview** (`node make-preview.cjs`) is for review and
  is not part of the deploy.
