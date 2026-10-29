/* TechArb News · app.js
   Static site + Supabase. If config.js has no keys, runs in demo mode with sample data. */
(function () {
  const cfg = window.TECHARB_CONFIG || {};
  const live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const sb = live ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const $ = (s) => document.querySelector(s);
  const KIND_LABEL = { shipped: "Shipped", launched: "Launched", raised: "Raised", hiring: "Hiring", asking: "Asking", broke: "What broke" };

  // ---------- demo data ----------
  const DEMO_EVENT = {
    id: "demo",
    title: "TechArb Reignite · Tuesday Night",
    starts_at: "2026-11-03T20:00:00-05:00",
    location: "The Michigan League · Basement",
    address: "911 N. University Ave., Ann Arbor",
    capacity: 120
  };
  let demoCount = 47;
  const DEMO_POSTS = [
    { id: 1, kind: "shipped", author: "Priya N.", startup: "Rota", headline: "Fourteen paying customers. Six of them from the Wall.", body: "Scheduling tool for campus dining shifts. Shipped the swap feature Thursday, manager at East Quad asked for it twice. Next: Markley.", link: "", created_at: "2026-10-27T14:00:00Z" },
    { id: 2, kind: "broke", author: "Marcus D.", startup: "Stacks", headline: "Onboarding lost 40% of signups at step two.", body: "Asked for a .edu email before showing any value. Moved it to after the first upload. Watching the number this week.", link: "", created_at: "2026-10-26T18:30:00Z" },
    { id: 3, kind: "asking", author: "Lena K.", startup: "Fieldnote", headline: "Need one agronomist who will take a 20-minute call.", body: "We're building field logging for small Michigan farms. Three farmers in, zero agronomists. If you know one, send them my way Tuesday.", link: "https://example.com", created_at: "2026-10-25T21:10:00Z" },
    { id: 4, kind: "launched", author: "Sam O.", startup: "Quietlist", headline: "Live on Product Hunt. 212 upvotes, 31 signups.", body: "Launched Tuesday morning after the Wall told me to stop polishing. Conversion is bad. Volume is real. Fixing the former.", link: "", created_at: "2026-10-24T13:00:00Z" },
    { id: 5, kind: "raised", author: "Dev A.", startup: "Loopwire", headline: "Closed $25k from two Michigan alumni.", body: "Both intros came from a Tuesday Night. Money hits Friday. Hiring a part-time designer next, see post below.", link: "", created_at: "2026-10-23T16:45:00Z" },
    { id: 6, kind: "hiring", author: "Dev A.", startup: "Loopwire", headline: "Looking for a designer, 10 hours a week, paid.", body: "Figma and taste. You'll own onboarding. Find me Tuesday or reply here.", link: "", created_at: "2026-10-23T16:50:00Z" }
  ];

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtWhen = (iso) => {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "America/Detroit" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Detroit" });
    return `${day} · ${time}`;
  };
  const fmtAgo = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const msg = (el, text, cls) => { el.textContent = text; el.className = "form-msg" + (cls ? " " + cls : ""); };

  // ---------- event + count ----------
  let currentEvent = DEMO_EVENT;

  async function loadEvent() {
    if (live) {
      const { data, error } = await sb.rpc("next_event");
      if (!error && data && data.length) currentEvent = data[0];
    }
    $("#ev-when").textContent = fmtWhen(currentEvent.starts_at);
    $("#ev-where").textContent = currentEvent.location;
    $("#ev-address").textContent = currentEvent.address || "";
    await loadCount();
  }

  async function loadCount() {
    let n = demoCount;
    if (live) {
      const { data, error } = await sb.rpc("rsvp_count", { p_event_id: currentEvent.id });
      if (!error && typeof data === "number") n = data;
    }
    const cap = currentEvent.capacity;
    $("#ev-count").innerHTML = n > 0
      ? `<b>${n}</b> builder${n === 1 ? "" : "s"} in so far${cap ? ` · ${Math.max(0, cap - n)} spots left` : ""}`
      : `Be the first name on the list.`;
  }

  // ---------- RSVP ----------
  $("#rsvp-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, out = $("#rsvp-msg"), btn = f.querySelector("button");
    if (f.website.value) return; // honeypot
    const name = f.name.value.trim(), email = f.email.value.trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msg(out, "Name and a real email, please.", "err");
    btn.disabled = true; msg(out, "Saving…");
    const row = {
      event_id: currentEvent.id, name, email,
      startup: f.startup.value.trim() || null,
      shipping: f.shipping.value.trim() || null,
      pitching: f.pitching.checked
    };
    let err = null;
    if (live) {
      const { error } = await sb.from("rsvps").insert(row);
      err = error;
    } else { demoCount++; }
    btn.disabled = false;
    if (err) {
      if (err.code === "23505") return msg(out, "You're already on the list. See you Tuesday.", "ok");
      return msg(out, "Something broke on our end. Just show up, there's pizza either way.", "err");
    }
    f.reset();
    msg(out, row.pitching ? "You're in, and you're on the Showcase list. Bring the 60 seconds." : "You're in. Laptops shut at 8.", "ok");
    loadCount();
  });

  // ---------- feed ----------
  let posts = [], filter = "all";

  async function loadPosts() {
    if (live) {
      const { data, error } = await sb.from("posts").select("id,kind,author,startup,headline,body,link,created_at").order("created_at", { ascending: false }).limit(60);
      posts = error ? [] : data;
    } else { posts = DEMO_POSTS.slice(); }
    renderFeed();
  }

  function renderFeed() {
    const list = filter === "all" ? posts : posts.filter((p) => p.kind === filter);
    $("#feed").innerHTML = list.map((p) => `
      <article class="item k-${esc(p.kind)}">
        <div class="kind">${esc(KIND_LABEL[p.kind] || p.kind)} <time datetime="${esc(p.created_at)}">${fmtAgo(p.created_at)}</time></div>
        <h3>${esc(p.headline)}</h3>
        <p>${esc(p.body)}</p>
        <div class="by"><b>${esc(p.startup)}</b> · ${esc(p.author)}</div>
        ${p.link ? `<a class="more" href="${esc(p.link)}" rel="noopener nofollow" target="_blank">See it</a>` : ""}
      </article>`).join("");
    $("#feed-empty").hidden = list.length > 0;
  }

  document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((x) => x.classList.remove("is-on"));
    c.classList.add("is-on"); filter = c.dataset.kind; renderFeed();
  }));

  // ---------- post ----------
  $("#post-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, out = $("#post-msg"), btn = f.querySelector("button");
    if (f.website.value) return;
    const row = {
      author: f.author.value.trim(), startup: f.startup.value.trim(), kind: f.kind.value,
      headline: f.headline.value.trim(), body: f.body.value.trim(), link: f.link.value.trim() || null
    };
    if (!row.author || !row.startup || !row.headline || !row.body) return msg(out, "Name, startup, headline and the story. All four.", "err");
    if (row.link && !/^https?:\/\//i.test(row.link)) return msg(out, "Links need to start with http:// or https://", "err");
    btn.disabled = true; msg(out, "Posting…");
    let err = null;
    if (live) {
      const { error } = await sb.from("posts").insert(row);
      err = error;
    } else {
      posts.unshift({ id: Date.now(), created_at: new Date().toISOString(), ...row });
    }
    btn.disabled = false;
    if (err) return msg(out, "Didn't save. Try again, or tell the room Tuesday.", "err");
    f.reset();
    msg(out, "Posted. It's live in the feed.", "ok");
    if (live) await loadPosts(); else renderFeed();
    document.getElementById("news").scrollIntoView({ behavior: "smooth" });
  });

  // ---------- boot ----------
  $("#demo-banner").hidden = live;
  loadEvent();
  loadPosts();
})();
