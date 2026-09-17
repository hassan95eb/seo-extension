/*  SEO Lens — image compressor page
 *  hassan mode : on
 *  https://github.com/hassan95eb/seo-extension
 */
/* SEO Lens — standalone image compressor.
 *
 * Shrinks a file and nothing else. The canvas is created at the bitmap's own width and
 * height, so the picture that comes out is the same picture at the same size: an image
 * already sized correctly for where it sits on a page must not be resized behind the
 * user's back, which is the one thing every "image optimizer" does by default.
 *
 * Encoding runs here, on the page, rather than in the service worker the panel's Optimize
 * button uses. That indirection exists because a content script's encoder would be subject
 * to the AUDITED page's CSP (see background.js); this is the extension's own page, under
 * the extension's own CSP, so the detour buys nothing.
 *
 * Nothing leaves the browser — hard rule 3. No fetch, no upload, no analytics.
 */
(function () {
  const I18N = window.__SEO_LENS_I18N__;
  const $ = (id) => document.getElementById(id);

  // Must match detectLang() in content.js and report.js, so the three never disagree.
  const detectLang = () => ((navigator.language || "").toLowerCase().startsWith("fa") ? "fa" : "en");
  let lang = detectLang();
  const t = (k, p) => I18N.ui(lang, k, p);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const kb = (n) => Math.max(1, Math.round(n / 1024));

  const EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

  let jobs = [];
  let seq = 0;
  let quality = 0.82;
  let format = "image/webp";
  let debounce = null;
  let running = false;

  /* ---------- language ---------- */
  function applyLang() {
    const dir = I18N.UI[lang].dir;
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    document.title = "SEO Lens — " + t("cmpTitle");
    $("page-title").textContent = t("cmpTitle");
    $("lead").textContent = t("cmpLead");
    $("drop-main").textContent = t("cmpDrop");
    $("drop-hint").textContent = t("cmpDropHint");
    $("l-quality").textContent = t("cmpQuality");
    $("l-format").textContent = t("cmpFormat");
    $("btn-all").textContent = t("cmpDownloadAll");
    $("btn-clear").textContent = t("cmpClear");
    $("note").textContent = t("cmpNote");
    render();
  }

  function saveLang() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ seoLensLang: lang });
      }
    } catch (e) { /* the page works fine without a stored preference */ }
  }

  function loadLang(done) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["seoLensLang"], (r) => {
          const stored = r && r.seoLensLang;
          if (stored === "fa" || stored === "en") lang = stored;
          done();
        });
        return;
      }
    } catch (e) { /* fall through to the detected language */ }
    done();
  }

  /* ---------- jobs ---------- */
  function addFiles(files) {
    let added = 0;
    Array.from(files || []).forEach((f) => {
      if (!f || !/^image\//i.test(f.type || "")) return;
      jobs.push({
        id: ++seq,
        file: f,
        name: f.name || "image",
        bytes: f.size,
        thumbUrl: URL.createObjectURL(f),
        status: "queued"
      });
      added++;
    });
    if (!added) return;
    render();
    runQueue();
  }

  function releaseOutput(job) {
    if (job.outUrl) { try { URL.revokeObjectURL(job.outUrl); } catch (e) { /* ignore */ } }
    job.outUrl = null;
    job.outBlob = null;
    job.outBytes = null;
  }

  function removeJob(id) {
    const i = jobs.findIndex((j) => j.id === id);
    if (i < 0) return;
    releaseOutput(jobs[i]);
    if (jobs[i].thumbUrl) { try { URL.revokeObjectURL(jobs[i].thumbUrl); } catch (e) { /* ignore */ } }
    jobs.splice(i, 1);
    render();
  }

  function clearAll() {
    jobs.forEach((j) => {
      releaseOutput(j);
      if (j.thumbUrl) { try { URL.revokeObjectURL(j.thumbUrl); } catch (e) { /* ignore */ } }
    });
    jobs = [];
    render();
  }

  /* One image at a time. A batch of large photos encoded in parallel is how a tab runs
   * out of memory; sequential costs a little wall-clock and nothing else. */
  async function runQueue() {
    if (running) return;
    running = true;
    try {
      for (;;) {
        const job = jobs.find((j) => j.status === "queued");
        if (!job) break;
        await encodeJob(job);
      }
    } finally {
      running = false;
      render();
    }
  }

  async function encodeJob(job) {
    releaseOutput(job);
    // An animated GIF survives createImageBitmap as its first frame only, which is a
    // silently destroyed file, not a compressed one. Say so instead of doing it.
    if (/^image\/gif$/i.test(job.file.type || "")) {
      job.status = "gif";
      render();
      return;
    }
    job.status = "busy";
    render();
    try {
      const bitmap = await createImageBitmap(job.file);
      job.w = bitmap.width;
      job.h = bitmap.height;
      // Same width, same height — the file shrinks, the picture does not.
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      // JPEG has no alpha channel: without this, a transparent PNG re-encodes onto
      // black. White matches how a browser composites it on an ordinary page.
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await canvas.convertToBlob({ type: format, quality });
      job.outBytes = blob.size;
      if (blob.size >= job.bytes) {
        // Handing back a bigger file under the word "compressed" would be a lie; PNG in
        // particular re-encodes larger more often than not.
        job.status = "nosave";
      } else {
        job.outBlob = blob;
        job.outUrl = URL.createObjectURL(blob);
        job.status = "done";
      }
    } catch (e) {
      job.status = "error";
      job.error = String((e && e.message) || e);
    }
    render();
  }

  function recompressAll() {
    jobs.forEach((j) => {
      if (j.status === "busy") return;
      releaseOutput(j);
      j.status = "queued";
    });
    render();
    runQueue();
  }

  function outName(job) {
    const base = (job.name || "image").replace(/\.[a-z0-9]+$/i, "") || "image";
    return base + "-min." + (EXT[format] || "webp");
  }

  /* ---------- rendering ---------- */
  function render() {
    const list = $("list");
    $("controls").hidden = jobs.length === 0;

    const saved = jobs.reduce(
      (n, j) => n + (j.status === "done" ? Math.max(0, j.bytes - j.outBytes) : 0), 0
    );
    const doneCount = jobs.filter((j) => j.status === "done").length;
    const sum = $("summary");
    sum.hidden = doneCount === 0;
    // One file is not "1 files" — a second message rather than a string built here,
    // the same rule the engine follows for wording that changes with its parameters.
    if (doneCount) {
      sum.textContent = doneCount === 1
        ? t("cmpSummaryOne", { saved: kb(saved) })
        : t("cmpSummary", { n: doneCount, saved: kb(saved) });
    }
    $("btn-all").disabled = doneCount === 0;

    list.innerHTML = jobs.map((job) => {
      let res = "";
      if (job.status === "busy" || job.status === "queued") {
        res = `<div class="res busy">${esc(t("cmpWorking"))}</div>`;
      } else if (job.status === "done") {
        const pct = job.bytes > 0 ? Math.round((1 - job.outBytes / job.bytes) * 100) : 0;
        res = `<div class="res ok">${esc(t("optimizeResult", {
          before: kb(job.bytes), after: kb(job.outBytes), pct
        }))}</div>`;
      } else if (job.status === "nosave") {
        res = `<div class="res flat">${esc(t("cmpNoSaving"))}</div>`;
      } else if (job.status === "gif") {
        res = `<div class="res flat">${esc(t("cmpGif"))}</div>`;
      } else if (job.status === "error") {
        res = `<div class="res bad">${esc(t("cmpFailed"))}</div>`;
      }
      // The filename comes from the user's own disk, so it carries dir="auto" for the
      // same reason page-extracted text does in the panel — hard rule 8.
      return `
      <div class="row" data-id="${job.id}">
        <img class="thumb" src="${esc(job.thumbUrl)}" alt="">
        <div class="meta">
          <div class="fname" dir="auto">${esc(job.name)}</div>
          <div class="dims">${job.w ? esc(t("cmpDims", { size: job.w + "\u00d7" + job.h })) + " · " : ""}${esc(t("weightLabel", { n: kb(job.bytes) }))}</div>
          ${res}
        </div>
        <div class="acts">
          ${job.status === "done"
            ? `<a class="dl" href="${esc(job.outUrl)}" download="${esc(outName(job))}">${esc(t("cmpDownload"))}</a>`
            : ""}
          <button class="rm" data-id="${job.id}">${esc(t("cmpRemove"))}</button>
        </div>
      </div>`;
    }).join("");

    list.querySelectorAll(".rm").forEach((b) => {
      b.addEventListener("click", () => removeJob(Number(b.dataset.id)));
    });
  }

  /* ---------- wiring ---------- */
  const drop = $("drop");
  const fileInput = $("file");

  drop.addEventListener("click", () => fileInput.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) => {
    document.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach((ev) => {
    document.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); });
  });
  document.addEventListener("drop", (e) => {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  document.addEventListener("paste", (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const files = Array.from(items)
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (files.length) addFiles(files);
  });

  $("quality").addEventListener("input", (e) => {
    const v = Number(e.target.value);
    $("quality-out").textContent = String(v);
    quality = v / 100;
    clearTimeout(debounce);
    debounce = setTimeout(recompressAll, 300);
  });
  $("format").addEventListener("change", (e) => {
    format = e.target.value;
    recompressAll();
  });
  $("btn-clear").addEventListener("click", clearAll);
  // Staggered, because a browser cancels a burst of simultaneous downloads.
  $("btn-all").addEventListener("click", () => {
    jobs.filter((j) => j.status === "done").forEach((job, n) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = job.outUrl;
        a.download = outName(job);
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, n * 250);
    });
  });
  $("btn-lang").addEventListener("click", () => {
    lang = lang === "fa" ? "en" : "fa";
    saveLang();
    applyLang();
  });

  loadLang(applyLang);
})();
