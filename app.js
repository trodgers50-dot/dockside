/**
 * Dockside — Track. Fix. Buy.
 * Boat + trailer maintenance product MVP
 * localStorage key: boatTrailerMaint.v1
 */
(function () {
  "use strict";

  const STORAGE_KEY = "boatTrailerMaint.v1";
  const DUE_SOON_DAYS = 14;

  const BUILD = "v1-harbor";


  const ICON_ANCHOR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c-1.1 0-2 .7-2 1.8V5c-3 .5-5 2.2-5 5.2 0 1.2.4 2.3 1.2 3.1L5 21h2.5l1.1-4.2c1.1.4 2.2.6 3.4.6s2.3-.2 3.4-.6L16.5 21H19l-1.2-5.7c.8-.8 1.2-1.9 1.2-3.1 0-3-2-4.7-5-5.2V3.8C14 2.7 13.1 2 12 2zm0 6.2c2.2 0 3.5 1 3.5 2.5S14.2 13.2 12 13.2 8.5 12.2 8.5 10.7 9.8 8.2 12 8.2z"/></svg>`;
  const ICON_BOAT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3 17h18M5 17l2-7h10l2 7M8 10V8l4-3 4 3v2"/></svg>`;


  const BOAT_TYPES = [
    { value: "center-console", label: "Center console" },
    { value: "bay-boat", label: "Bay boat" },
    { value: "pontoon", label: "Pontoon" },
    { value: "deck-boat", label: "Deck boat" },
    { value: "fishing-bass", label: "Fishing / bass" },
    { value: "ski-wake", label: "Ski / wake" },
    { value: "sailboat", label: "Sailboat" },
    { value: "other", label: "Other" },
  ];

  const ENGINE_TYPES = [
    { value: "outboard", label: "Outboard" },
    { value: "inboard", label: "Inboard" },
    { value: "sterndrive", label: "Sterndrive / I/O" },
    { value: "jet", label: "Jet" },
    { value: "electric", label: "Electric" },
    { value: "none", label: "None / sail only" },
  ];

  const ENGINE_HP_PRESETS = ["9.9", "25", "40", "60", "90", "115", "150", "200", "250", "300+"];

  const TRAILER_TYPES = [
    { value: "bunk", label: "Bunk trailer" },
    { value: "roller", label: "Roller trailer" },
    { value: "float-on", label: "Float-on" },
    { value: "pontoon", label: "Pontoon trailer" },
    { value: "pwc", label: "Personal watercraft" },
    { value: "none", label: "Other / no trailer" },
  ];

  const ENGINE_TASK_TITLES = [
    "Engine oil & filter",
    "Lower unit / gearcase oil",
    "Impeller / water pump",
    "Fuel filter / water separator",
  ];

  const TRAILER_HEAVY_TITLES = [
    "Hub bearings / grease",
    "Brakes (if applicable)",
    "Leaf springs / suspension",
    "Wheel bearings service",
  ];

  function labelFor(list, value) {
    const hit = list.find((x) => x.value === value);
    return hit ? hit.label : value || "";
  }

  function boatTypeLabel(v) { return labelFor(BOAT_TYPES, v); }
  function engineTypeLabel(v) { return labelFor(ENGINE_TYPES, v); }
  function trailerTypeLabel(v) { return labelFor(TRAILER_TYPES, v); }

  function getBoat() {
    return state.assets.find((a) => a.type === "boat") || null;
  }
  function getTrailer() {
    return state.assets.find((a) => a.type === "trailer") || null;
  }

  function needsSetup(data) {
    if (!data || data.setupComplete !== true) return true;
    const boat = (data.assets || []).find((a) => a.type === "boat");
    const trailer = (data.assets || []).find((a) => a.type === "trailer");
    if (!boat || !boat.boatType || !boat.engineType) return true;
    if (!trailer || !trailer.trailerType) return true;
    return false;
  }

  function gearSummaryParts(data) {
    const d = data || state;
    const boat = (d.assets || []).find((a) => a.type === "boat");
    const trailer = (d.assets || []).find((a) => a.type === "trailer");
    const parts = [];
    if (boat?.makeModel) {
      parts.push(boat.makeModel);
    } else if (boat?.boatType) {
      parts.push(boatTypeLabel(boat.boatType));
    }
    if (boat?.engineMakeModel) {
      parts.push(boat.engineMakeModel);
    } else if (boat?.engineType) {
      const eng = engineTypeLabel(boat.engineType);
      if (boat.engineType === "none") {
        parts.push("No engine");
      } else if (boat.engineSizeLabel) {
        let size = boat.engineSizeLabel.replace(/ HP$/i, "hp").replace(/ kW$/i, "kW");
        if (/^\d/.test(size) && !size.endsWith("hp") && !size.endsWith("kW")) size += "hp";
        const short = eng.replace(" / I/O", "").replace(" / sail only", "").toLowerCase();
        parts.push(`${size} ${short}`);
      } else {
        parts.push(eng);
      }
    }
    if (trailer?.makeModel) {
      parts.push(trailer.makeModel);
    } else if (trailer?.trailerType) {
      if (trailer.trailerType === "none") parts.push("No trailer");
      else parts.push(trailerTypeLabel(trailer.trailerType));
    }
    return parts;
  }

  function gearSummaryLabel(data) {
    const parts = gearSummaryParts(data);
    return parts.length ? parts.join(" · ") : "Your gear";
  }

  function taskRelevantForGear(task, boat, trailer) {
    const title = task.title;
    const engineType = boat?.engineType || "";
    const trailerType = trailer?.trailerType || "";

    const isEngineTask = ENGINE_TASK_TITLES.includes(title);
    const isTrailerHeavy = TRAILER_HEAVY_TITLES.includes(title);

    if (isEngineTask) {
      if (!engineType || engineType === "none") return false;
      if (engineType === "electric") {
        // Electric: skip oil / lower unit / impeller / fuel filter
        return false;
      }
      if (engineType === "inboard") {
        // Pure inboard: no outboard lower-unit service
        if (title === "Lower unit / gearcase oil") return false;
      }
      if (engineType === "jet") {
        if (title === "Lower unit / gearcase oil") return false;
      }
      // outboard, sterndrive, jet (partial): keep remaining engine tasks
      return true;
    }

    if (isTrailerHeavy) {
      if (!trailerType || trailerType === "none") return false;
      if (trailerType === "pwc") {
        // PWC trailer: lighter set — hide brakes / springs / full bearing service
        if (
          title === "Brakes (if applicable)" ||
          title === "Leaf springs / suspension" ||
          title === "Wheel bearings service"
        ) {
          return false;
        }
      }
    }

    return true;
  }

  function visibleTasks(tasks) {
    const boat = getBoat();
    const trailer = getTrailer();
    if (!state.setupComplete) return tasks;
    return tasks.filter((t) => taskRelevantForGear(t, boat, trailer));
  }

  function optionsHTML(list, selected) {
    return list
      .map(
        (o) =>
          `<option value="${escapeAttr(o.value)}" ${o.value === selected ? "selected" : ""}>${escapeHtml(o.label)}</option>`
      )
      .join("");
  }

  // ── Helpers ──────────────────────────────────────────────
  const uid = () =>
    "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const daysBetween = (a, b) => {
    const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  };

  const addDays = (iso, days) => {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  function amazonSearch(q) {
    return "https://www.amazon.com/s?k=" + encodeURIComponent(q);
  }

  function partSearchQuery(part) {
    if (part && part.search) return part.search;
    if (part && part.url) {
      try {
        const u = new URL(part.url);
        const k = u.searchParams.get("k");
        if (k) return k;
      } catch (e) { /* ignore */ }
    }
    return (part && part.name) || "";
  }

  function buyUrlForPart(part, asset) {
    const base = partSearchQuery(part);
    const boat = getBoat();
    const trailer = getTrailer();
    let prefix = "";
    if (asset && asset.type === "trailer") {
      prefix = (trailer && trailer.makeModel) || "";
    } else {
      prefix =
        (boat && boat.engineMakeModel) ||
        (boat && boat.makeModel) ||
        "";
    }
    const q = prefix ? (prefix + " " + base).trim() : base;
    return amazonSearch(q);
  }

  function affiliateNoteHTML() {
    return `<p class="affiliate-note">Buy links help support Dockside</p>`;
  }

  function addGearCTAHTML(compact) {
    return `
      <div class="gear-cta-card ${compact ? "compact" : ""}" data-action="goto-setup">
        <div class="gear-cta-body">
          <strong>Add your boat &amp; trailer</strong>
          <span>Boat type, engine, and trailer — so guides and parts match what you run</span>
        </div>
        <button type="button" class="btn btn-primary" data-action="goto-setup">Add my gear</button>
      </div>`;
  }

  function yourGearCardHTML() {
    const incomplete = needsSetup(state);
    if (incomplete) {
      return `
        <div class="your-gear-card incomplete">
          <div class="ygc-kicker">Harbor setup</div>
          <div class="ygc-top">
            <div class="ygc-icon">${ICON_BOAT}</div>
            <div class="ygc-body">
              <h3>Add your boat &amp; trailer</h3>
              <p>Boat type, engine, and trailer — so guides and parts match what you run</p>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-block" data-action="goto-setup">Add my gear</button>
        </div>`;
    }
    const summary = gearSummaryLabel();
    return `
      <div class="your-gear-card complete">
        <div class="ygc-kicker">Your vessel</div>
        <div class="ygc-top">
          <div class="ygc-icon">${ICON_ANCHOR}</div>
          <div class="ygc-body">
            <h3>Your boat &amp; trailer</h3>
            <p class="ygc-summary">${escapeHtml(summary)}</p>
            <p class="ygc-hint">Guides &amp; parts are tailored to this.</p>
          </div>
        </div>
        <button type="button" class="btn btn-secondary" data-action="goto-setup">Edit</button>
      </div>`;
  }

  function nextDue(task) {
    if (!task.lastDoneAt || !task.intervalDays) return null;
    return addDays(task.lastDoneAt.slice(0, 10), task.intervalDays);
  }

  function daysUntilDue(task) {
    const due = nextDue(task);
    if (!due) return null;
    return daysBetween(todayISO(), due);
  }

  function statusOf(task) {
    const d = daysUntilDue(task);
    if (d === null) return "upcoming";
    if (d < 0) return "overdue";
    if (d <= DUE_SOON_DAYS) return "due-soon";
    return "ok";
  }

  function relativeLabel(task) {
    const d = daysUntilDue(task);
    if (!task.lastDoneAt) return "Never done";
    if (d === null) return "No interval set";
    if (d < 0) {
      const n = Math.abs(d);
      return n === 1 ? "Overdue 1 day" : `Overdue ${n} days`;
    }
    if (d === 0) return "Due today";
    if (d === 1) return "Due tomorrow";
    return `Due in ${d} days`;
  }

  function intervalLabel(task) {
    const parts = [];
    if (task.intervalDays) parts.push(`Every ${task.intervalDays} days`);
    if (task.intervalHours) parts.push(`Every ${task.intervalHours} hrs`);
    return parts.join(" · ") || "As needed";
  }

  function part(id, name, why, search) {
    return { id, name, why, search, url: amazonSearch(search) };
  }


// Catalog of how-to + parts keyed by task title (for seed + migration)
  // Torque/specs are typical published ranges — always verify in OEM service manual.
  const GUIDE_CATALOG = {
    "Engine oil & filter": {
      warnings: [
        "Hot oil and engine parts can burn — warm briefly then wait a few minutes before draining.",
        "Support the boat/trailer securely; never work under an unsupported hull.",
        "Dispose of used oil and filters at a recycling center — never on the ground or in household trash.",
        "When to stop and call a shop: metal glitter in oil, milky oil (coolant/water mix on some engines), stripped drain plug, or unknown oil capacity/grade.",
      ],
      tools: [
        "Oil drain pan",
        "Correct socket / wrench for drain plug",
        "Oil filter wrench",
        "Funnel",
        "Rags / absorbent pads",
        "Torque wrench (inch-lb or ft-lb as needed)",
        "Gloves & eye protection",
      ],
      fluids: [
        "FC-W marine engine oil — viscosity per OEM (typical 10W-30 / 25W-40 for many outboards)",
        "Capacity: typical small–mid outboards ~1–6 qt — verify for your engine; never guess",
      ],
      torqueSpecs: [
        { part: "Oil drain plug", spec: "Typical 10–18 ft-lb (many outboards) — verify OEM", note: "Always use a new crush washer/gasket when specified" },
        { part: "Oil filter", spec: "Hand-tight + ¾–1 turn after gasket contact (typical)", note: "Do not over-torque spin-ons; follow filter or engine manual" },
        { part: "Oil fill cap", spec: "Hand-snug", note: "Confirm seated fully before running" },
      ],
      steps: [
        "Prep: gather OEM oil grade/capacity from the engine manual or under-cowl label. Put on eye protection and gloves.",
        "Warm the engine 2–3 minutes so oil flows, then shut off, remove the key, and wait a few minutes so oil settles without being scalding.",
        "Place a drain pan under the drain. Remove the drain plug carefully; let oil drain fully. Catch and keep the crush washer if reusable — usually replace it.",
        "While draining, inspect oil color/smell: milky = water/coolant concern; heavy glitter = internal wear — photograph and call a shop if unsure.",
        "Remove the old filter with a filter wrench. Wipe the mounting base clean. Confirm the old gasket came off with the filter (don’t double-gasket).",
        "Lightly oil the new filter gasket with fresh oil. Install hand-tight to gasket contact, then the typical further turn — do not crank with a long wrench.",
        "Install the drain plug with a new crush washer. Torque to the typical range only after confirming your OEM value; snug is not a substitute for a missing washer.",
        "Refill with the correct FC-W (or OEM) oil to the dipstick/sight mark. Start with less than full capacity, then top off.",
        "Run the engine at idle on flush muffs or in water. Check for leaks at plug and filter. Shut down, wait, re-check the dipstick, and top off.",
        "Reset any oil-maintenance reminder if equipped. Log hours/date in Dockside. Recycle used oil and the filter.",
        "Shop stop: if the plug won’t seal, threads are damaged, or pressure/warning lights stay on after refill — do not keep running; get service.",
      ],
      parts: [
        part("oil-filter", "Marine oil filter", "Matches your engine’s filter size", "marine boat oil filter"),
        part("engine-oil", "FC-W marine engine oil", "Correct viscosity for outboards/inboards", "FC-W marine engine oil"),
        part("oil-drain-pan", "Oil drain pan", "Catch used oil without spills", "oil drain pan"),
        part("crush-washers", "Oil drain crush washers", "Fresh seal on the drain plug", "oil drain plug crush washer"),
      ],
    },
    "Lower unit / gearcase oil": {
      warnings: [
        "Prop cleared, engine off, key out — rotating props cause serious injury.",
        "Always remove the lower (drain) plug before the upper (vent) so the case doesn’t create a vacuum mess — and so you can stop if water pours out first.",
        "Milky oil or heavy metal = do not just refill and ignore — diagnose seals/gears.",
        "When to stop and call a shop: water pouring from drain, large metal chunks, damaged drain threads, or unknown gearcase capacity.",
      ],
      tools: [
        "Gear oil pump bottle",
        "Correct screwdriver / hex for drain & vent screws",
        "Drain pan & rags",
        "New crush washers / gaskets",
        "Gloves & eye protection",
      ],
      fluids: [
        "Marine lower-unit gear lube (GL-5 / OEM-specified) — typical capacity often ~0.5–1.0 L depending on gearcase; verify for your engine",
      ],
      torqueSpecs: [
        { part: "Drain & vent screws", spec: "Snug with new crush washer; typical published values often ~5–10 ft-lb", note: "Typical — verify in OEM manual. Washer replacement matters more than inventing high torque" },
      ],
      steps: [
        "Safety: clear the prop area, key out, boat/trailer level and chocked. Have absorbent pads ready.",
        "Locate lower (drain) and upper (vent/fill) screws on the gearcase. Clean paint/grime from screw heads so washers don’t get contaminated.",
        "Remove the LOWER drain screw first and catch oil. Then remove the UPPER vent screw so oil drains freely.",
        "Inspect drained oil: milky/tan = water intrusion; fine glitter vs chunks = note severity. Smell for burnt odor.",
        "If water or heavy metal is present, stop the DIY refill plan — seals, bearings, or gears may need a shop. Photograph the oil.",
        "Fit a new crush washer on the drain screw. Thread the gear-oil pump into the drain hole.",
        "Pump OEM-spec gear lube up from the bottom until clean oil seeps steadily from the vent hole (no big air pockets).",
        "With oil still seeping, install the UPPER vent screw with a new washer and snug to typical low ft-lb / OEM value — do not overtighten soft aluminum.",
        "Quickly remove the pump and install the LOWER drain screw with a new washer; snug similarly. Wipe the case clean so new leaks show.",
        "After a short run (or idle on muffs), recheck for seepage at both screws. Log the service date/hours.",
        "Shop stop: recurring milky oil after a refill means a seal or water-intrusion problem — get pressure-tested before the next trip.",
      ],
      parts: [
        part("gear-oil", "Lower unit gear oil", "Marine-rated gear lube for the case", "boat lower unit gear oil"),
        part("gear-oil-pump", "Gear oil pump bottle", "Fill from the bottom without air pockets", "gear oil pump bottle"),
        part("drain-gaskets", "Lower unit drain plug gaskets", "Fresh seals prevent leaks", "outboard drain plug gasket"),
      ],
    },
    "Impeller / water pump": {
      warnings: [
        "Overheating can destroy an engine quickly — no tell-tale / overheat alarm = shut down immediately.",
        "Lower units are heavy; support the housing — don’t hang it on the driveshaft or shift shaft.",
        "Misaligned splines or pinched shift shaft on reinstall can cause shift failure or damage.",
        "When to stop and call a shop: seized bolts, damaged driveshaft splines, cracked housing, or you’re unsure of shift-shaft alignment.",
      ],
      tools: [
        "Lower-unit support / jack stand",
        "Socket set & screwdrivers",
        "Torque wrench",
        "Impeller kit (impeller, gaskets, O-rings, wear plate as supplied)",
        "Dish soap or impeller assembly lube",
        "Marine grease for splines (OEM-approved)",
        "Pick / gasket scraper (plastic preferred)",
      ],
      torqueSpecs: [
        { part: "Water pump housing bolts", spec: "Typical low ft-lb / inch-lb range — often ~60–120 in-lb depending on size", note: "Typical — verify OEM. Tighten evenly in a cross pattern" },
        { part: "Lower unit mounting nuts/bolts", spec: "Brand-specific; often in the mid ft-lb range", note: "Typical — verify in OEM service manual before final torque" },
        { part: "Prop nut (if removed)", spec: "See engine manual — do not guess", note: "Cotter pin / keeper required; never reuse a damaged pin" },
      ],
      steps: [
        "Confirm the problem: at idle in water or on muffs, verify tell-tale stream. Overheat warning or no stream → stop running the engine.",
        "Gather the exact impeller kit for your year/model. Read the OEM sequence for lower-unit drop (shift into forward often required).",
        "Remove the prop if it helps clearance (note thrust washer stack). Support the lower unit before removing mount nuts.",
        "Remove lower-unit fasteners, separate carefully, and lower the unit onto a stable support. Protect the driveshaft.",
        "Open the water pump housing. Photograph impeller orientation and plate stack before removal.",
        "Remove old impeller, wear plate, gaskets, and O-rings. Clean mating surfaces — no old gasket left behind.",
        "Inspect housing and cup for grooves/burns. Deep wear may need a housing kit, not just a rubber impeller.",
        "Install new wear plate/gaskets per kit instructions. Lubricate the new impeller lightly (soap/assembly lube) and slide on in the correct rotation direction while turning the shaft as specified.",
        "Reassemble the housing; torque bolts evenly to the typical/OEM value — do not crush the housing by overtightening one corner first.",
        "Grease driveshaft splines lightly with approved grease. Align shift shaft and water tube; raise and seat the lower unit fully before tightening mounts.",
        "Torque mount nuts to OEM typical values. Reinstall prop with correct washer stack; prop nut per manual with a new cotter pin/keeper — do not guess prop-nut torque.",
        "Test on muffs or in water at idle: strong tell-tale, no overheat alarm, forward/neutral/reverse shift cleanly. Log the service.",
        "Shop stop: no tell-tale after install, grinding on shift, or metal in the old pump → professional diagnosis before the next outing.",
      ],
      parts: [
        part("impeller", "Water pump impeller kit", "Rubber vanes wear out — replace on schedule", "boat impeller water pump kit"),
        part("pump-gasket", "Water pump gasket / housing kit", "Seals the pump against leaks", "outboard water pump gasket kit"),
        part("impeller-grease", "Impeller / assembly lube", "Eases install without damaging vanes", "impeller installation lubricant"),
      ],
    },
    "Fuel filter / water separator": {
      warnings: [
        "Gasoline vapors are flammable — work outside/ventilated, no sparks, smoking, or hot engines nearby.",
        "Relieve pressure / close shutoffs as equipped; have a fire extinguisher rated for fuel fires nearby.",
        "Dispose of fuel/water mix as hazardous waste — not down drains.",
        "When to stop and call a shop: cracked filter head, seized spin-on, persistent air leaks after prime, or fuel smell in the bilge you can’t source.",
      ],
      tools: [
        "Filter wrench",
        "Drain pan & absorbent pads",
        "Fuel-line pliers (as needed)",
        "Approved container for waste fuel",
        "Gloves & eye protection",
      ],
      fluids: [
        "Fresh filter element matched to housing (e.g. 10-micron marine separator — verify micron rating for your system)",
      ],
      torqueSpecs: [
        { part: "Spin-on filter", spec: "Hand-tight + ~¾–1 turn after gasket contact (typical)", note: "Typical — do not overtighten; lubricate O-ring first" },
        { part: "Bowl / housing screws", spec: "Snug evenly; follow housing markings", note: "Verify OEM if torque is published" },
      ],
      steps: [
        "Work outdoors or in strong ventilation. No sparks. Put down absorbent pads and a pan under the separator.",
        "Close the fuel shutoff valve if fitted. Note the filter part number on the old element before removal.",
        "Open the bowl petcock (if equipped) and drain water/fuel into an approved container. Look for heavy water or debris.",
        "Remove the spin-on or cartridge element. Wipe the head clean; confirm old O-ring/gasket is removed.",
        "Lubricate new O-rings with a dab of clean fuel or manufacturer-approved grease — never dry-install.",
        "Install the new element hand-tight to contact, then the typical additional turn. Reinstall bowl if cartridge style; snug evenly.",
        "Open the shutoff. Prime the bulb or electric pump until firm. Inspect every joint for weep.",
        "Start and idle; watch for hesitation (air) and re-check for leaks. Shut down and re-snug only if the manual allows — never chase leaks by overtightening plastic.",
        "Label the filter with the date. Log the service. Dispose of fuel waste properly.",
        "Shop stop: you can’t get a firm prime, engine dies from fuel starvation after replace, or the filter head is cracked — get a tech before launching.",
      ],
      parts: [
        part("fuel-filter", "Fuel filter / water separator", "Removes water and debris before the engine", "boat fuel water separator filter"),
        part("fuel-filter-wrench", "Filter wrench", "Removes stubborn spin-on housings", "fuel filter wrench"),
        part("absorbent-pads", "Fuel absorbent pads", "Catch drips safely during service", "fuel absorbent pads"),
      ],
    },
    "Battery & connections": {
      warnings: [
        "Batteries can explode from sparks near charging/venting — eye protection required; no smoking.",
        "Always disconnect negative (−) first and reconnect negative last.",
        "Never short across terminals with tools. Remove metal jewelry.",
        "When to stop and call a shop / electrician: swollen battery case, rotten cable insulation near the starter, or mystery parasitic drains.",
      ],
      tools: [
        "Eye protection & gloves",
        "Correct wrench for terminal nuts",
        "Wire brush / terminal cleaner",
        "Baking soda + water (neutralize acid corrosion)",
        "Dielectric grease or terminal protectant",
        "Multimeter",
      ],
      torqueSpecs: [
        { part: "Battery terminal nuts", spec: "Snug firmly — typical ~5–8 ft-lb for many clamps; do not crush the post", note: "Typical — verify clamp style; overtightening cracks posts" },
        { part: "Battery hold-down", spec: "Snug so battery cannot shift", note: "Must stay secure underway" },
      ],
      steps: [
        "Put on eye protection. Identify house vs start batteries and any ACR/combiner. Have the tender unplugged.",
        "Disconnect negative (−) cable first on each battery you’ll service, then positive (+). Cap the positive if it can swing into metal.",
        "Remove hold-downs as needed. Inspect the case for cracks/swelling — replace if damaged; don’t try to ‘clean’ a failing battery back to life.",
        "Clean posts and cable ends with a wire brush. Neutralize white/green crust with baking soda solution, rinse lightly, dry fully.",
        "Inspect cables for frayed strands, green copper, or swollen insulation — replace damaged leads before they strand you.",
        "Reinstall battery, secure the hold-down, reconnect positive first, then negative. Torque terminal nuts to a firm typical snug — don’t round the post.",
        "Apply dielectric grease or felt protectors on posts. Verify resting voltage (~12.6V+ for a charged flooded/AGM 12V — verify chemistry).",
        "Reconnect tender/combiner. Test thruster/start loads briefly and recheck for heat at terminals.",
        "Log the service. Replace batteries that won’t hold charge after a proper charge cycle.",
        "Shop stop: cables melt under load, voltage collapses under cranking, or you’re unsure of dual-battery wiring — get a marine electrician.",
      ],
      parts: [
        part("terminal-cleaner", "Battery terminal cleaner", "Removes corrosion for solid contact", "battery terminal cleaner brush"),
        part("dielectric-grease", "Dielectric grease", "Protects terminals from corrosion", "dielectric grease marine"),
        part("battery-tender", "Marine battery tender", "Keeps batteries topped between trips", "marine battery tender charger"),
        part("terminal-protectors", "Terminal protector felt washers", "Extra corrosion barrier", "battery terminal protector washers"),
      ],
    },
    "Zincs / anodes": {
      warnings: [
        "Painted or insulated anodes do nothing — contact must be metal-to-metal.",
        "Wrong alloy for water type (zinc/alum/magnesium) can under- or over-protect.",
        "When to stop and call a shop: severe underwater metal pitting despite “new” anodes, or bonding-system questions on larger boats.",
      ],
      tools: [
        "Correct sockets / screwdrivers for anode bolts",
        "Wire brush or Scotch-Brite",
        "Penetrating oil (for stuck fasteners)",
        "Replacement anodes matched to location & water type",
      ],
      torqueSpecs: [
        { part: "Anode mounting bolts", spec: "Snug firmly for solid electrical contact — do not strip aluminum threads", note: "Typical — verify OEM if published; contact quality beats high torque" },
      ],
      steps: [
        "Identify anode locations: shaft, prop nut zinc, trim tabs, outdrive, hull fittings, swim ladder, etc.",
        "Match alloy to water: zinc (salt), aluminum (brackish/salt — common modern), magnesium (fresh) — confirm for your region/OEM.",
        "Remove anodes that are ~50%+ consumed, loose, crumbling, or painted over.",
        "Clean the mounting pad to bright metal so the new anode bonds electrically.",
        "Install new anodes with correct stainless/OEM fasteners. Snug for solid contact without stripping soft metal.",
        "Verify nothing is isolated by plastic washers that break continuity (unless the design requires isolation — follow OEM).",
        "Note any unusual pitting on shafts/outdrives — that may need a bonding or stray-current check.",
        "Log replacement date; recheck mid-season if you boat in warm saltwater heavily.",
        "Shop stop: rapid anode loss (weeks) or active pitting with intact anodes → corrosion specialist / yard.",
      ],
      parts: [
        part("shaft-zinc", "Shaft / prop shaft anode", "Sacrificial protection for underwater metal", "boat shaft zinc anode"),
        part("outdrive-anode", "Outdrive / trim tab anode kit", "Protects sterndrive and trim hardware", "outdrive anode kit"),
        part("anode-bolts", "Stainless anode bolts", "Secure mount without galvanic issues", "stainless anode mounting bolts"),
      ],
    },
    "Hull wash & wax": {
      warnings: [
        "Don’t grind grit into gelcoat — rinse first.",
        "Avoid harsh solvents on vinyl, graphics, and non-skid unless product-approved.",
        "When to stop and call a shop: soft spots, growing blisters, or cracks into laminate.",
      ],
      tools: [
        "Hose / freshwater rinse",
        "Marine boat soap",
        "Soft brush or wash mitt",
        "Microfiber towels / chamois",
        "Marine wax or polish + applicator",
      ],
      torqueSpecs: [],
      steps: [
        "Work in the shade if waxing. Rinse the hull thoroughly with fresh water to remove salt and grit.",
        "Mix marine boat soap per label. Wash with a soft mitt/brush from the top down; rinse often.",
        "Pay attention to waterline scum and trailer bunk marks — use appropriate stain removers only as directed.",
        "Rinse completely; dry with microfiber/chamois to reduce spotting.",
        "Inspect gelcoat for blisters, cracks, and chalking while the surface is clean. Photograph anything concerning.",
        "Apply marine wax/polish above the waterline in small sections; buff per product directions. Avoid heavy wax buildup on non-skid.",
        "Clean hardware and rinse salt from hinges/latches; touch up protectant on rubber/vinyl if needed.",
        "Log the wash/wax date. Plan haul-out service if you found blistering or damage.",
        "Shop stop: soft deck underfoot, spider cracks spreading, or osmosis blisters — get a surveyor/yard opinion.",
      ],
      parts: [
        part("boat-soap", "Marine boat soap", "Safe cleaner for gelcoat and vinyl", "marine boat soap wash"),
        part("marine-wax", "Marine wax / polish", "UV protection and shine above waterline", "marine boat wax"),
        part("microfiber", "Microfiber wash & buff towels", "Scratch-safer drying and polishing", "microfiber boat towels"),
      ],
    },
    "Winterize / dewinterize": {
      warnings: [
        "Use non-toxic marine (propylene glycol) antifreeze in potable/raw-water systems as required — never automotive ethylene glycol in systems that can discharge overboard where prohibited.",
        "Fogging and fuel steps vary widely by engine — follow your OEM winterize bulletin.",
        "When to stop and call a shop: you can’t verify block drain locations, closed cooling service is due, or sterndrive bellows look cracked.",
      ],
      tools: [
        "Motor flusher muffs (outboards/sterndrives as applicable)",
        "Antifreeze pump / funnel",
        "Fogging oil (if OEM uses it)",
        "Fuel stabilizer",
        "Battery tender",
        "Basic hand tools for drain plugs",
      ],
      fluids: [
        "Marine antifreeze (−50° propylene glycol) — volume depends on engine & raw-water circuit; verify",
        "Fuel stabilizer dosed per bottle for tank volume",
        "Fogging oil if required by OEM",
      ],
      torqueSpecs: [
        { part: "Hull / engine drain plugs", spec: "Hand-snug with good washer/seal", note: "Confirm installed before spring launch" },
      ],
      steps: [
        "Read your engine’s winterize procedure for year/model. Gather antifreeze, stabilizer, fogging oil, and muffs.",
        "Top off or treat fuel with stabilizer; run the engine so treated fuel reaches the system (per product/OEM).",
        "Change gearcase oil if due before storage (water in lube freezes/expands risk). Service engine oil if OEM recommends pre-storage change.",
        "Flush raw-water cooling, then pump marine antifreeze through until discharge shows strong antifreeze color (outboard/sterndrive methods differ — follow OEM).",
        "Fog cylinders only if your OEM procedure calls for it, with proper air intake access and fire awareness.",
        "Drain freshwater systems or protect them with potable-safe antifreeze. Leave hull drain plugs OUT if stored on land so rainwater doesn’t fill the bilge.",
        "Charge batteries; store on a tender or disconnect per battery type. Remove portable tanks if desired.",
        "Cover with a breathable cover; note any rodent precautions for the off-season.",
        "Spring dewinterize: reinstall drain plugs, recharge batteries, flush antifreeze, verify tell-tale/cooling, check for nesting damage, then sea-trial gently.",
        "Shop stop: unknown closed-cooling condition, cracked bellows, or no cooling stream after dewinterize — yard before the first trip.",
      ],
      parts: [
        part("antifreeze", "Marine antifreeze (-50°)", "Non-toxic propylene glycol for winterizing", "marine antifreeze propylene glycol"),
        part("fogging-oil", "Fogging oil", "Protects cylinders during storage", "marine fogging oil"),
        part("fuel-stabilizer", "Fuel stabilizer", "Prevents varnish in stored fuel", "marine fuel stabilizer"),
      ],
    },
    "Drain plugs check": {
      warnings: [
        "Missing drain plugs are a top cause of boats sinking at the ramp or shortly after launch.",
        "When to stop: if you cannot visually/feel confirm plugs before launch — do not launch.",
      ],
      tools: [
        "Spare drain plugs",
        "Replacement O-rings",
        "Rag for wipe/inspect",
      ],
      torqueSpecs: [
        { part: "Hull drain plugs", spec: "Hand-snug with intact O-ring — do not overtighten and crush the seal", note: "Typical — verify your plug style (expansion vs threaded)" },
      ],
      steps: [
        "Before every launch: walk to each drain location and visually confirm plugs are installed.",
        "Feel that threaded/expansion plugs are snug with a good O-ring — not finger-loose.",
        "Inspect O-rings for cracks/flattening; replace if doubtful. Keep a spare plug pair in the glove box or console.",
        "After haul-out, remove plugs to drain bilge/hull water; store plugs in a dedicated clip or zip bag so they don’t get lost.",
        "Never rely on memory alone — make plug check part of the trailer-hookup routine with lights and drain plugs together.",
        "If someone else launched the boat, re-verify plugs yourself before leaving the ramp area.",
        "Shop stop: cracked drain fitting in the hull or stripped threads — get a yard repair before the next trip.",
      ],
      parts: [
        part("drain-plugs", "Boat drain plugs (pair)", "Spare set so you’re never stuck at the ramp", "boat drain plugs"),
        part("drain-orings", "Drain plug O-rings", "Fresh seals prevent leaks underway", "boat drain plug o-ring"),
      ],
    },

    "Hub bearings / grease": {
      warnings: [
        "Hot hubs after a tow can mean failing bearings — don’t ignore heat, smoke, or grinding.",
        "Jack stands on solid ground; chock the opposite wheel. Never rely on a jack alone.",
        "When to stop and call a shop: blue heat marks on bearings, pitted races, damaged spindle threads, or you can’t set preload confidently.",
      ],
      tools: [
        "Floor jack & jack stands",
        "Wheel chocks",
        "Grease gun (for Bearing Buddy style)",
        "Marine wheel bearing grease",
        "Pliers for cotter pin",
        "Torque wrench for lug nuts",
        "Gloves",
      ],
      torqueSpecs: [
        { part: "Spindle / castle nut preload", spec: "Set per axle design — typically snug then back to first cotter slot with slight end-play check", note: "Typical procedure — verify axle/hub manual; do not guess a high torque on a castle nut" },
        { part: "Wheel lug nuts", spec: "Typical passenger-trailer range often ~80–100 ft-lb; common 1/2\" studs often ~80–90 ft-lb; larger studs may need ~90–120 ft-lb", note: "Typical — verify axle/wheel sticker or OEM. Recheck after 25–50 miles" },
      ],
      steps: [
        "After a highway tow, carefully compare hub temps (IR thermometer helps). One hot hub = service soon.",
        "Park level, chock wheels, jack and support the trailer on stands. Remove the wheel if you need full access.",
        "Remove dust cap or Bearing Buddy. Check for grease contamination (milky = water).",
        "Grab the tire at 12 and 6 o’clock and check play. Excessive clunk or grinding = full bearing service, not just a grease squirt.",
        "If using Bearing Buddy: wipe clean and pump marine grease until the piston flexes slightly — don’t blow the seal with excessive pressure.",
        "If packing by hand: plan a full clean/pack (see Wheel bearings service guide) with new seal and cotter pin.",
        "Reinstall dust cap/Bearing Buddy. Install the wheel and torque lug nuts in a star pattern to the typical range for your stud size — confirm sticker/OEM.",
        "Lower the trailer. Recheck lug torque after 25–50 miles. Listen for hum/growl on the next tow.",
        "Shop stop: noise returns quickly, grease turns milky after every dunk, or spindle nut won’t hold — axle shop time.",
      ],
      parts: [
        part("bearing-grease", "Marine wheel bearing grease", "Water-resistant grease for hubs", "marine trailer wheel bearing grease"),
        part("bearing-buddy", "Bearing Buddy / hub protector", "Keeps water out and grease in", "bearing buddy trailer"),
        part("cotter-pins", "Axle cotter pins", "Secure the castle nut after service", "trailer axle cotter pins"),
      ],
    },
    "Tire pressure & tread": {
      warnings: [
        "Underinflation is a leading cause of trailer tire blowouts — check cold PSI before every trip.",
        "When to stop: sidewall bulge, cords showing, or tires older than ~5–7 years (DOT date) even with tread left.",
      ],
      tools: [
        "Quality tire pressure gauge",
        "12V inflator or air compressor",
        "Torque wrench",
        "Tread depth gauge (optional)",
      ],
      torqueSpecs: [
        { part: "Wheel lug nuts", spec: "See axle/wheel sticker; typical passenger-trailer range ~80–100 ft-lb (1/2\" studs often ~80–90; larger may be ~90–120)", note: "Typical — verify for your wheel/axle. Recheck after 25–50 mi if wheels were removed" },
      ],
      steps: [
        "Check pressures cold (before driving). Read the PSI on the tire sidewall (max cold) or trailer placard if provided — inflate to the correct cold pressure for the load.",
        "Inflate/deflate each tire including the spare. Replace missing valve caps with metal caps when possible.",
        "Inspect tread for cupping, feathering, weather cracking, and embedded stones. Uneven wear can mean alignment/axle/suspension issues.",
        "Check DOT week/year; replace aging trailer tires even if they “look OK.” Trailer tires age out.",
        "Look for bulges, cuts, or previous plugs in the sidewall — sidewalls are not safely repairable like many tread punctures.",
        "If you removed a wheel, torque lug nuts in a star pattern to the typical range and recheck after 25–50 miles.",
        "Log pressures and any tire replacements. Carry a spare, iron, and torque wrench on longer trips.",
        "Shop stop: repeated blowouts, bent rim, or axle that won’t hold alignment — trailer shop inspection.",
      ],
      parts: [
        part("tire-gauge", "Digital tire pressure gauge", "Accurate cold PSI readings", "digital tire pressure gauge"),
        part("portable-inflator", "12V portable inflator", "Top off at the ramp or roadside", "12V portable tire inflator"),
        part("valve-caps", "Metal valve stem caps", "Keep grit and moisture out of stems", "metal tire valve caps"),
      ],
    },
    "Lights & wiring": {
      warnings: [
        "Dark trailer lights are a ticket and a crash risk — test before every tow.",
        "When to stop and call a shop: burnt wiring smell, melted connector, or breakaway battery that won’t hold charge on braked trailers.",
      ],
      tools: [
        "Tow-vehicle tester or helper",
        "Dielectric grease",
        "Wire brush for connector pins",
        "UV-rated zip ties",
        "Multimeter (optional)",
        "Replacement bulbs / LED lamps",
      ],
      torqueSpecs: [
        { part: "Light board / bracket bolts", spec: "Snug; use lock washers or nylon-insert nuts as fitted", note: "Typical — don’t crush lamp housings" },
      ],
      steps: [
        "Plug into the tow vehicle. Test tail, brake, turn, and marker lights with a helper or pedal/light tester.",
        "Clean the 4/5/7-pin connector contacts; apply a thin film of dielectric grease.",
        "For a dark lamp: check bulb/LED module, then ground, then power — trailer lights fail on grounds constantly.",
        "Trace the harness along the frame and bunks for chafing, pinches, and corroded bullet connectors. Repair with marine-grade heat-shrink terminals.",
        "Replace cracked lenses and corroded sockets. Prefer sealed LED assemblies where appropriate.",
        "Secure loose wiring with UV-rated zip ties so nothing drags on the road or catches on the bunks.",
        "Retest all functions. On braked trailers, also verify breakaway switch wiring isn’t damaged.",
        "Shop stop: recurring shorts, melted 7-pin, or electric brake magnets not actuating — trailer electrician/brake tech.",
      ],
      parts: [
        part("led-trailer-lights", "LED trailer light kit", "Brighter, longer-lasting markers/tails", "LED boat trailer light kit"),
        part("trailer-connector", "4/7-pin trailer connector", "Reliable plug to the tow vehicle", "trailer wiring connector 7 pin"),
        part("dielectric-grease-lights", "Dielectric grease", "Keeps moisture out of bulb sockets", "dielectric grease"),
      ],
    },
    "Winch & strap": {
      warnings: [
        "A frayed strap can snap under load — replace at the first serious doubt.",
        "Never rely on the winch alone as the highway restraint; use bow safety chain/strap as designed.",
        "When to stop and call a shop: cracked winch stand welds, stripped gears, or bow eye damage.",
      ],
      tools: [
        "Replacement strap or cable",
        "Winch lubricant (light)",
        "Wrenches for winch mounts",
        "Flashlight for inspection",
      ],
      torqueSpecs: [
        { part: "Winch mounting bolts", spec: "Typical mid ft-lb range — often ~30–50+ ft-lb depending on bolt size/grade", note: "Typical — verify hardware grade and winch stand design; use lock hardware" },
        { part: "Winch stand / bow stop bolts", spec: "Snug to structural spec; inspect for elongated holes", note: "Typical — verify; elongated holes mean replacement, not more torque" },
      ],
      steps: [
        "Inspect webbing/cable for frays, UV cracks, crushed sections, and bent hooks. Replace questionable straps before they fail at the ramp.",
        "Check the winch ratchet pawls and gear engagement. Operate both directions; lubricate lightly per maker guidance — don’t gum gears with heavy grease.",
        "Verify the hook’s safety latch works and the bow eye isn’t cracked or elongated.",
        "Confirm a separate bow safety chain/cable exists and is rated — winch strap is for loading, not sole highway security.",
        "Inspect winch stand and mounts for cracked welds or loose bolts; retorque mounts to typical values for the bolt size after confirming hardware.",
        "Rinse salt after coastal trips; store the strap dry and out of UV when possible.",
        "Test winching on land with the trailer chocked and boat secured. Practice controlled loading — never stand in the strap’s snap-back line.",
        "Shop stop: stand flexes under load, gears skip, or bow eye is damaged — repair before the next launch.",
      ],
      parts: [
        part("winch-strap", "Trailer winch strap", "Replace worn webbing before it snaps", "boat trailer winch strap"),
        part("winch-hook", "Winch hook / safety latch", "Secure connection to the bow eye", "boat winch hook latch"),
        part("winch-lube", "Winch / gear lubricant", "Keeps gears smooth without gumming", "winch lubricant spray"),
      ],
    },
    "Coupler / safety chains": {
      warnings: [
        "An unlocked coupler can separate on the road — always pin/lock the latch.",
        "Safety chains must be crossed under the tongue.",
        "When to stop and call a shop: cracked coupler body, worn latch that won’t stay closed, or mismatched ball/coupler size.",
      ],
      tools: [
        "Coupler lock or hitch pin",
        "Grease for hitch ball",
        "Wrenches for coupler bolts",
        "Flashlight",
      ],
      torqueSpecs: [
        { part: "Coupler mounting bolts", spec: "Typical Grade 5/8 hardware often in the mid–high ft-lb range by size (e.g. 1/2\" bolts commonly ~60–80+ ft-lb)", note: "Typical — verify coupler manufacturer torque and use lock washers/prevailing-torque nuts" },
      ],
      steps: [
        "Confirm hitch ball diameter matches the coupler (commonly 2\" or 2-5/16\") and that ratings meet trailer GVWR needs.",
        "Lower the coupler fully onto the ball; close the latch until it seats. Insert the lock pin or coupler lock.",
        "Lift the trailer tongue jack slightly to prove the coupler is locked on the ball (it shouldn’t lift off).",
        "Cross safety chains under the tongue so they cradle the coupler if it separates. Attach hooks with openings down / secured.",
        "If surge or electric brakes: attach the breakaway cable to the tow vehicle frame (not to the safety chains).",
        "Lightly grease the hitch ball; wipe excess so it doesn’t fling onto the bumper.",
        "Inspect coupler bolts/mounts for looseness; retorque to typical manufacturer guidance. Check latch spring tension.",
        "Before each tow: latch, pin, chains crossed, breakaway hooked, lights plugged.",
        "Shop stop: latch won’t stay closed, coupler cracked, or bolts keep loosening — replace the coupler assembly.",
      ],
      parts: [
        part("coupler-lock", "Trailer coupler lock", "Theft deterrent and latch security", "trailer coupler lock"),
        part("safety-chains", "Safety chains with hooks", "Required backup if coupler fails", "trailer safety chains"),
        part("hitch-ball", "Hitch ball (correct size)", "Match coupler rating and diameter", "trailer hitch ball 2 inch"),
      ],
    },
    "Brakes (if applicable)": {
      warnings: [
        "Know surge hydraulic vs electric before adjusting. Incorrect work can leave you with no trailer brakes.",
        "Never tow a braked trailer with a disabled breakaway system.",
        "When to stop and call a shop: scored drums/rotors, leaking actuator, contaminated linings, or you’re unsure of adjustment.",
      ],
      tools: [
        "Jack & stands / wheel chocks",
        "Brake adjustment tool (as applicable)",
        "Brake cleaner (linings off-vehicle guidance)",
        "Multimeter (electric brakes)",
        "DOT fluid (surge) if checking level",
        "Torque wrench",
      ],
      fluids: [
        "DOT brake fluid for hydraulic surge actuators — use the DOT type marked on the reservoir (often DOT 3); typical — verify",
      ],
      torqueSpecs: [
        { part: "Wheel lug nuts", spec: "Typical passenger-trailer ~80–100 ft-lb (confirm stud size / sticker)", note: "Typical — verify OEM/axle sticker" },
        { part: "Brake backing plate / flange bolts", spec: "Brand/axle specific — often mid ft-lb range", note: "Typical — verify axle manual; do not invent torque" },
      ],
      steps: [
        "Identify system type: surge hydraulic actuator on the tongue vs electric magnets in the hubs. Note brake controller settings in the tow vehicle.",
        "Chock wheels; jack and support safely. Remove a wheel to inspect shoes/pads, drums/rotors, springs, and magnets (electric).",
        "Measure lining thickness; replace when worn to OEM minimums or if contaminated with grease.",
        "Adjust mechanical shoes per axle instructions so a slight drag is felt, then back off as specified. Spin the hub and listen.",
        "Surge systems: check actuator fluid level and inspect rubber boot, master cylinder, and lines for leaks. Replace fluid only with the correct DOT type if service is needed.",
        "Electric systems: verify magnet surface, wiring continuity, and controller output. Check the breakaway battery charge.",
        "Test breakaway with wheels chocked: pulling the pin should apply brakes. Replace frayed lanyards.",
        "Reinstall wheels; torque lug nuts to the typical range and recheck after 25–50 miles. Road-test in a safe area at low speed.",
        "Shop stop: pulling to one side, leaking actuator, glazed/contaminated linings, or no breakaway function — brake tech before highway speeds.",
      ],
      parts: [
        part("brake-pads", "Trailer brake pads / shoes", "Restore stopping power when worn", "boat trailer brake pads"),
        part("brake-fluid", "DOT brake fluid", "Hydraulic surge systems only — correct DOT type", "DOT 3 brake fluid"),
        part("breakaway-kit", "Breakaway switch & battery", "Applies brakes if trailer separates", "trailer breakaway switch kit"),
      ],
    },
    "Leaf springs / suspension": {
      warnings: [
        "Cracked leaves or loose U-bolts can cause axle shift and tire blowouts.",
        "Support the trailer properly — spring removal can release stored energy.",
        "When to stop and call a shop: broken main leaf, shifted axle, or elongated U-bolt holes in the spring plate.",
      ],
      tools: [
        "Jack & stands / wheel chocks",
        "Torque wrench",
        "Socket set for U-bolts",
        "Grease gun (if zerks fitted)",
        "Flashlight / mirror",
      ],
      torqueSpecs: [
        { part: "Axle U-bolts", spec: "Typical light-trailer U-bolts often ~45–70+ ft-lb depending on diameter/grade; heavier axles higher", note: "Typical — verify axle/spring plate spec. Retorque after 50–100 miles" },
        { part: "Shackle bolts", spec: "Snug per hardware; do not over-crush rubber bushings", note: "Typical — verify; some bushings need a specific snug, not max torque" },
      ],
      steps: [
        "Park level; chock wheels. Inspect springs for cracks, shifted leaves, flattened arch, or rust scale at the pads.",
        "Check U-bolts for looseness, stretch, or heavy rust. Loose U-bolts allow the axle to walk.",
        "Retorque U-bolts evenly in a crisscross pattern to the typical range for your bolt size — confirm axle documentation when possible.",
        "Inspect bushings and shackles for play or dry squeaks. Lubricate grease fittings if present; replace torn bushings.",
        "Look for uneven tire wear and measure distance from axle to fixed frame points side-to-side — inequality can mean a bent axle or failed spring.",
        "Replace damaged springs in pairs when practical; don’t mix a collapsed spring with a new one on the same axle long-term.",
        "After any U-bolt work, recheck torque after 50–100 miles of towing.",
        "Shop stop: cracked leaves, walking axle, or frame damage at the hangers — trailer shop alignment/axle service.",
      ],
      parts: [
        part("u-bolts", "Axle U-bolt kit", "Clamps springs securely to the axle", "trailer axle u-bolt kit"),
        part("spring-bushings", "Leaf spring bushings", "Quiet, controlled spring movement", "trailer leaf spring bushings"),
        part("grease-gun", "Grease gun cartridge", "Service suspension zerks", "grease gun cartridge marine"),
      ],
    },
    "Wheel bearings service": {
      warnings: [
        "A seized hub on the highway is dangerous — service annually or after deep saltwater submersion.",
        "Jack stands required; chock securely.",
        "When to stop and call a shop: scored spindle, blue/black heat-damaged bearings, or damaged castle-nut threads.",
      ],
      tools: [
        "Jack & stands / wheel chocks",
        "Socket/wrench for spindle nut",
        "Pliers (cotter pin)",
        "Bearing packer or packing gloves",
        "Marine wheel bearing grease",
        "New grease seal",
        "Torque wrench (lug nuts)",
        "Shop towels / brake clean (bearings off-hub)",
      ],
      torqueSpecs: [
        { part: "Spindle castle nut (preload)", spec: "Typical: tighten while turning hub to seat bearings, then back off and retighten gently to first cotter alignment with slight end-play — axle-specific", note: "Typical procedure — verify axle manual. Do not leave a loose nut; do not preload like a vehicle axle torque-to-yield bolt" },
        { part: "Wheel lug nuts", spec: "Typical passenger-trailer ~80–100 ft-lb by stud size (often ~80–90 for 1/2\"; larger studs may be ~90–120)", note: "Typical — verify sticker/OEM. Recheck after 25–50 miles" },
      ],
      steps: [
        "Plan the job with new seals, cotter pins, and marine grease on hand. Match bearing numbers before disassembly if possible.",
        "Chock, jack, and stand the trailer. Remove the wheel, dust cap/Bearing Buddy, cotter pin, spindle nut, washer, and hub assembly.",
        "Pry out the old grease seal; remove inner/outer bearings. Clean all grease from hub and bearings (appropriate solvent; dry fully).",
        "Inspect bearings and races for pitting, spalling, or blue heat marks. Replace bearings and races as a matched set if damaged.",
        "Pack bearings thoroughly until grease pushes through the cage. Coat the hub cavity lightly — don’t overpack so hot grease has nowhere to go if the design vents.",
        "Install bearings and a new seal squarely (use a seal driver or careful tapping on the outer edge only).",
        "Slide the hub onto the spindle; install washer and castle nut. Set preload per axle type while rotating the hub; finish at a cotter-pin slot. Always use a new cotter pin.",
        "Reinstall dust cap or Bearing Buddy (pump to slight flex if Buddy). Mount the wheel; torque lug nuts in a star pattern to the typical range.",
        "Lower the trailer. Road-test at modest speed; recheck hub temp and lug torque after 25–50 miles. Log the service date.",
        "Shop stop: roughness you can’t eliminate, spindle wear grooves, or repeated water intrusion — hub/axle specialist.",
      ],
      parts: [
        part("bearing-kit", "Trailer bearing & race kit", "Matched inner/outer bearings for your axle", "boat trailer bearing kit"),
        part("hub-seal", "Hub grease seal", "Keeps grease in and water out", "trailer hub grease seal"),
        part("bearing-grease-svc", "Marine wheel bearing grease", "Pack bearings for the season", "marine trailer bearing grease"),
        part("bearing-pack-tool", "Bearing packer tool", "Packs grease through the cage evenly", "wheel bearing packer tool"),
      ],
    },
  };

  function enrichFromCatalog(task) {
    const cat = GUIDE_CATALOG[task.title];
    if (!cat) {
      if (!Array.isArray(task.steps)) task.steps = [];
      if (!Array.isArray(task.parts)) task.parts = [];
      if (!Array.isArray(task.tools)) task.tools = [];
      if (!Array.isArray(task.torqueSpecs)) task.torqueSpecs = [];
      if (!Array.isArray(task.warnings)) task.warnings = [];
      return task;
    }
    // Always refresh guide body from catalog so returning users get DIY-complete how-tos
    task.steps = (cat.steps || []).slice();
    task.tools = (cat.tools || []).slice();
    task.torqueSpecs = (cat.torqueSpecs || []).map((t) => ({ ...t }));
    task.warnings = (cat.warnings || []).slice();
    if (Array.isArray(cat.fluids) && cat.fluids.length) {
      task.fluids = cat.fluids.slice();
    } else {
      delete task.fluids;
    }
    // Parts: fill only when empty so custom user parts are preserved
    if (!Array.isArray(task.parts) || task.parts.length === 0) {
      task.parts = (cat.parts || []).map((p) => ({ ...p, id: p.id + "_" + (task.id || uid()).slice(-6) }));
    }
    return task;
  }


  // ── Seed data ────────────────────────────────────────────
  function seedData() {
    const boatId = uid();
    const trailerId = uid();
    const daysAgo = (n) => addDays(todayISO(), -n);

    const assets = [
      {
        id: boatId,
        name: "My Boat",
        type: "boat",
        notes: "Primary vessel — update name & hour meter in Settings.",
        hourMeter: null,
        odometer: null,
        boatType: null,
        engineType: null,
        engineHp: null,
        engineSizeLabel: null,
        makeModel: null,
        engineMakeModel: null,
      },
      {
        id: trailerId,
        name: "My Trailer",
        type: "trailer",
        notes: "Boat trailer — hubs, lights, tires, winch, brakes.",
        hourMeter: null,
        odometer: null,
        trailerType: null,
        makeModel: null,
      },
    ];

    const boatTasks = [
      { title: "Engine oil & filter", category: "Engine", intervalDays: 100, intervalHours: 100, lastDoneAt: daysAgo(70), priority: "high", notes: "Change oil and filter; check for leaks." },
      { title: "Lower unit / gearcase oil", category: "Engine", intervalDays: 180, intervalHours: null, lastDoneAt: daysAgo(120), priority: "high", notes: "Inspect for milky oil (water intrusion)." },
      { title: "Impeller / water pump", category: "Cooling", intervalDays: 365, intervalHours: 200, lastDoneAt: daysAgo(300), priority: "high", notes: "Replace impeller; inspect housing & gaskets." },
      { title: "Fuel filter / water separator", category: "Fuel", intervalDays: 180, intervalHours: null, lastDoneAt: daysAgo(175), priority: "medium", notes: "Drain water bowl; replace filter element." },
      { title: "Battery & connections", category: "Electrical", intervalDays: 90, intervalHours: null, lastDoneAt: daysAgo(60), priority: "medium", notes: "Clean terminals; check voltage & charge." },
      { title: "Zincs / anodes", category: "Hull", intervalDays: 180, intervalHours: null, lastDoneAt: daysAgo(90), priority: "medium", notes: "Replace when ~50% consumed." },
      { title: "Hull wash & wax", category: "Hull", intervalDays: 90, intervalHours: null, lastDoneAt: daysAgo(45), priority: "low", notes: "Wash, rinse, wax above waterline." },
      { title: "Winterize / dewinterize", category: "Seasonal", intervalDays: 365, intervalHours: null, lastDoneAt: daysAgo(200), priority: "high", notes: "Antifreeze, fogging, batteries, covers." },
      { title: "Drain plugs check", category: "Pre-launch", intervalDays: 30, intervalHours: null, lastDoneAt: daysAgo(28), priority: "high", notes: "Verify drain plugs installed before launch." },
    ];

    const trailerTasks = [
      { title: "Hub bearings / grease", category: "Axles", intervalDays: 180, intervalHours: null, lastDoneAt: daysAgo(160), priority: "high", notes: "Repack bearings; check for play & heat after tow." },
      { title: "Tire pressure & tread", category: "Tires", intervalDays: 30, intervalHours: null, lastDoneAt: daysAgo(20), priority: "high", notes: "Inflate to sidewall PSI cold; check spare." },
      { title: "Lights & wiring", category: "Electrical", intervalDays: 60, intervalHours: null, lastDoneAt: daysAgo(55), priority: "high", notes: "Tail, brake, turn, marker lights; check connector." },
      { title: "Winch & strap", category: "Winch", intervalDays: 90, intervalHours: null, lastDoneAt: daysAgo(40), priority: "medium", notes: "Inspect strap/cable wear; lubricate winch." },
      { title: "Coupler / safety chains", category: "Hitch", intervalDays: 90, intervalHours: null, lastDoneAt: daysAgo(50), priority: "high", notes: "Latch, lock, chains crossed under hitch." },
      { title: "Brakes (if applicable)", category: "Brakes", intervalDays: 180, intervalHours: null, lastDoneAt: daysAgo(100), priority: "high", notes: "Surge or electric brakes; adjust & inspect pads." },
      { title: "Leaf springs / suspension", category: "Suspension", intervalDays: 180, intervalHours: null, lastDoneAt: daysAgo(150), priority: "medium", notes: "Check U-bolts, bushings, spring cracks." },
      { title: "Wheel bearings service", category: "Axles", intervalDays: 365, intervalHours: null, lastDoneAt: daysAgo(340), priority: "high", notes: "Full service interval reminder — pack or replace." },
    ];

    const tasks = [
      ...boatTasks.map((t) => enrichFromCatalog({ id: uid(), assetId: boatId, ...t })),
      ...trailerTasks.map((t) => enrichFromCatalog({ id: uid(), assetId: trailerId, ...t })),
    ];

    return {
      version: 1,
      setupComplete: false,
      assets,
      tasks,
      logs: [],
      createdAt: new Date().toISOString(),
    };
  }

  // ── Persistence + migration ──────────────────────────────
  function migrateData(data) {
    let changed = false;
    if (typeof data.setupComplete !== "boolean") {
      data.setupComplete = false;
      changed = true;
    }
    (data.assets || []).forEach((a) => {
      if (a.type === "boat") {
        if (!("boatType" in a)) { a.boatType = null; changed = true; }
        if (!("engineType" in a)) { a.engineType = null; changed = true; }
        if (!("engineHp" in a)) { a.engineHp = null; changed = true; }
        if (!("engineSizeLabel" in a)) { a.engineSizeLabel = null; changed = true; }
        if (!("makeModel" in a)) { a.makeModel = null; changed = true; }
        if (!("engineMakeModel" in a)) { a.engineMakeModel = null; changed = true; }
      }
      if (a.type === "trailer") {
        if (!("trailerType" in a)) { a.trailerType = null; changed = true; }
        if (!("makeModel" in a)) { a.makeModel = null; changed = true; }
      }
    });
    // Missing gear fields → force setup again
    const boat = (data.assets || []).find((a) => a.type === "boat");
    const trailer = (data.assets || []).find((a) => a.type === "trailer");
    const gearMissing =
      !boat?.boatType ||
      !boat?.engineType ||
      !trailer?.trailerType;
    if (gearMissing && data.setupComplete) {
      data.setupComplete = false;
      changed = true;
    }
    data.tasks.forEach((t) => {
      const cat = GUIDE_CATALOG[t.title];
      const before = cat
        ? JSON.stringify({
            steps: t.steps,
            tools: t.tools,
            torqueSpecs: t.torqueSpecs,
            warnings: t.warnings,
            fluids: t.fluids,
            partsLen: Array.isArray(t.parts) ? t.parts.length : 0,
          })
        : null;
      enrichFromCatalog(t);
      if (cat) {
        const after = JSON.stringify({
          steps: t.steps,
          tools: t.tools,
          torqueSpecs: t.torqueSpecs,
          warnings: t.warnings,
          fluids: t.fluids,
          partsLen: Array.isArray(t.parts) ? t.parts.length : 0,
        });
        if (before !== after) changed = true;
      }
    });
    if (changed) save(data);
    return data;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const data = seedData();
        save(data);
        return data;
      }
      const data = JSON.parse(raw);
      if (!data.assets || !data.tasks) throw new Error("bad shape");
      return migrateData(data);
    } catch (e) {
      console.warn("Resetting storage", e);
      const data = seedData();
      save(data);
      return data;
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let state = load();
  let currentView = "track";
  let currentAssetId = null;
  let currentTaskId = null;
  let taskDetailFocus = null;
  let filterAssetId = "all";
  let guidesFilter = "all";
  let editingTaskId = null;
  let logTaskId = null;
  let navHistory = [];

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function navigate(view, opts = {}) {
    if (opts.pushHistory && currentView !== view) {
      navHistory.push({
        view: currentView,
        assetId: currentAssetId,
        taskId: currentTaskId,
        focus: taskDetailFocus,
      });
    }
    currentView = view;
    if (opts.assetId !== undefined) currentAssetId = opts.assetId;
    if (opts.taskId !== undefined) currentTaskId = opts.taskId;
    if (opts.focus !== undefined) taskDetailFocus = opts.focus;
    if (opts.clearHistory) navHistory = [];
    render();
    window.scrollTo(0, 0);
    if (view === "task" && taskDetailFocus === "guide") {
      setTimeout(() => {
        const el = document.getElementById("howto-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  function goBack() {
    const prev = navHistory.pop();
    if (prev) {
      currentView = prev.view;
      currentAssetId = prev.assetId;
      currentTaskId = prev.taskId;
      taskDetailFocus = prev.focus;
      render();
      window.scrollTo(0, 0);
    } else if (currentView === "task") {
      navigate("track", { clearHistory: true });
    } else if (currentView === "setup") {
      if (state.setupComplete) navigate("gear", { clearHistory: true });
      else navigate("track", { clearHistory: true });
    } else if (currentView === "asset" || currentView === "settings" || currentView === "assets") {
      navigate("gear", { clearHistory: true });
    } else {
      navigate("track", { clearHistory: true });
    }
  }

  function markDoneQuick(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const when = todayISO();
    task.lastDoneAt = when;
    state.logs.push({
      id: uid(),
      taskId,
      assetId: task.assetId,
      doneAt: when,
      hours: null,
      miles: null,
      cost: null,
      notes: "",
    });
    save(state);
    toast(`✓ ${task.title}`);
    render();
  }

  function completeLog(form) {
    const task = state.tasks.find((t) => t.id === logTaskId);
    if (!task) return;
    const doneAt = form.doneAt.value || todayISO();
    const hours = form.hours.value ? Number(form.hours.value) : null;
    const miles = form.miles.value ? Number(form.miles.value) : null;
    const cost = form.cost.value ? Number(form.cost.value) : null;
    const notes = form.notes.value.trim();

    task.lastDoneAt = doneAt;
    if (hours != null) {
      const asset = state.assets.find((a) => a.id === task.assetId);
      if (asset && asset.type === "boat") asset.hourMeter = hours;
    }
    if (miles != null) {
      const asset = state.assets.find((a) => a.id === task.assetId);
      if (asset && asset.type === "trailer") asset.odometer = miles;
    }

    state.logs.push({
      id: uid(),
      taskId: task.id,
      assetId: task.assetId,
      doneAt,
      hours,
      miles,
      cost,
      notes,
    });
    save(state);
    closeOverlay();
    toast(`Logged: ${task.title}`);
    render();
  }

  function saveTask(form) {
    const title = form.title.value.trim();
    if (!title) {
      toast("Title is required");
      return;
    }
    const payload = {
      assetId: form.assetId.value,
      title,
      category: form.category.value.trim() || "General",
      intervalDays: form.intervalDays.value ? Number(form.intervalDays.value) : null,
      intervalHours: form.intervalHours.value ? Number(form.intervalHours.value) : null,
      lastDoneAt: form.lastDoneAt.value || null,
      notes: form.notes.value.trim(),
      priority: form.priority.value || "medium",
    };

    if (editingTaskId) {
      const t = state.tasks.find((x) => x.id === editingTaskId);
      Object.assign(t, payload);
      enrichFromCatalog(t);
      toast("Task updated");
    } else {
      const t = enrichFromCatalog({ id: uid(), steps: [], parts: [], ...payload });
      state.tasks.push(t);
      toast("Task added");
    }
    save(state);
    closeOverlay();
    render();
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    save(state);
    closeOverlay();
    toast("Task deleted");
    if (currentView === "task" && currentTaskId === taskId) {
      goBack();
    } else {
      render();
    }
  }

  function saveAssets(form) {
    state.assets.forEach((a) => {
      const name = form[`name_${a.id}`]?.value?.trim();
      const notes = form[`notes_${a.id}`]?.value?.trim() ?? a.notes;
      const hourMeter = form[`hour_${a.id}`]?.value;
      const odometer = form[`odo_${a.id}`]?.value;
      if (name) a.name = name;
      a.notes = notes;
      a.hourMeter = hourMeter !== "" && hourMeter != null ? Number(hourMeter) : a.hourMeter;
      a.odometer = odometer !== "" && odometer != null ? Number(odometer) : a.odometer;
    });
    save(state);
    toast("Assets saved");
    render();
  }

  function resetData() {
    state = seedData();
    save(state);
    filterAssetId = "all";
    guidesFilter = "all";
    currentAssetId = null;
    currentTaskId = null;
    closeOverlay();
    toast("Data reset — tell us what you run");
    navigate("setup", { clearHistory: true });
  }

  function resolveEngineSize(form) {
    const engineType = form.engineType.value;
    if (engineType === "none") {
      return { engineHp: null, engineSizeLabel: null };
    }
    if (engineType === "electric") {
      const kw = form.engineKw?.value?.trim();
      if (kw) {
        const n = Number(kw);
        return {
          engineHp: Number.isFinite(n) ? n : null,
          engineSizeLabel: `${kw} kW`,
        };
      }
      return { engineHp: null, engineSizeLabel: null };
    }
    const preset = form.engineHpPreset?.value || "";
    if (preset === "custom") {
      const custom = form.engineHpCustom?.value?.trim();
      if (!custom) return { engineHp: null, engineSizeLabel: null };
      const n = Number(custom);
      return {
        engineHp: Number.isFinite(n) ? n : null,
        engineSizeLabel: `${custom} HP`,
      };
    }
    if (preset === "300+") {
      return { engineHp: 300, engineSizeLabel: "300+ HP" };
    }
    if (preset) {
      const n = Number(preset);
      return {
        engineHp: Number.isFinite(n) ? n : null,
        engineSizeLabel: `${preset} HP`,
      };
    }
    return { engineHp: null, engineSizeLabel: null };
  }

  function saveSetup(form) {
    const boatType = form.boatType.value;
    const engineType = form.engineType.value;
    const trailerType = form.trailerType.value;
    if (!boatType || !engineType || !trailerType) {
      toast("Pick boat, engine, and trailer types");
      return;
    }
    const size = resolveEngineSize(form);
    const boatMakeModel = (form.boatMakeModel?.value || "").trim() || null;
    const engineMakeModel = (form.engineMakeModel?.value || "").trim() || null;
    const trailerMakeModel = (form.trailerMakeModel?.value || "").trim() || null;
    const boat = getBoat();
    const trailer = getTrailer();
    if (boat) {
      boat.boatType = boatType;
      boat.engineType = engineType;
      boat.engineHp = size.engineHp;
      boat.engineSizeLabel = size.engineSizeLabel;
      boat.makeModel = boatMakeModel;
      boat.engineMakeModel = engineType === "none" ? null : engineMakeModel;
      const typeLabel = boatMakeModel || boatTypeLabel(boatType);
      if (!boat.name || boat.name === "My Boat" || BOAT_TYPES.some((t) => t.label === boat.name)) {
        boat.name = typeLabel;
      }
    }
    if (trailer) {
      trailer.trailerType = trailerType;
      trailer.makeModel = trailerType === "none" ? null : trailerMakeModel;
      if (
        !trailer.name ||
        trailer.name === "My Trailer" ||
        TRAILER_TYPES.some((t) => t.label === trailer.name) ||
        trailer.name === "No trailer"
      ) {
        trailer.name =
          trailerType === "none"
            ? "No trailer"
            : trailerMakeModel || trailerTypeLabel(trailerType);
      }
    }
    state.setupComplete = true;
    save(state);
    toast("Schedule tailored to your gear");
    navigate("track", { clearHistory: true });
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dockside-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded");
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.assets || !data.tasks) throw new Error("Invalid backup");
        state = migrateData(data);
        save(state);
        toast("Backup imported");
        navigate("track", { clearHistory: true });
      } catch (e) {
        toast("Import failed — invalid file");
      }
    };
    reader.readAsText(file);
  }


  function openOverlay(html) {
    const ov = document.getElementById("overlay");
    ov.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
    ov.classList.add("open");
    ov.onclick = (e) => {
      if (e.target === ov) closeOverlay();
    };
  }

  function closeOverlay() {
    const ov = document.getElementById("overlay");
    ov.classList.remove("open");
    ov.innerHTML = "";
    editingTaskId = null;
    logTaskId = null;
  }

  function openLogSheet(taskId) {
    logTaskId = taskId;
    const task = state.tasks.find((t) => t.id === taskId);
    const asset = state.assets.find((a) => a.id === task.assetId);
    openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Log completion</h2>
      <p style="color:var(--text-muted);font-size:0.9rem;margin:-8px 0 16px">${escapeHtml(task.title)} · ${escapeHtml(asset?.name || "")}</p>
      <form id="log-form">
        <div class="form-group">
          <label for="doneAt">Date done</label>
          <input type="date" id="doneAt" name="doneAt" value="${todayISO()}" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="hours">Hours (optional)</label>
            <input type="number" id="hours" name="hours" min="0" step="0.1" placeholder="${asset?.hourMeter ?? "—"}" />
          </div>
          <div class="form-group">
            <label for="miles">Miles (optional)</label>
            <input type="number" id="miles" name="miles" min="0" step="1" placeholder="${asset?.odometer ?? "—"}" />
          </div>
        </div>
        <div class="form-group">
          <label for="cost">Cost $ (optional)</label>
          <input type="number" id="cost" name="cost" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea id="notes" name="notes" placeholder="Parts used, shop, observations…"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">Save log</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="close-overlay">Cancel</button>
        </div>
      </form>
    `);
    document.getElementById("log-form").onsubmit = (e) => {
      e.preventDefault();
      completeLog(e.target);
    };
  }

  function openTaskForm(taskId) {
    editingTaskId = taskId || null;
    const task = taskId ? state.tasks.find((t) => t.id === taskId) : null;
    const assetOptions = state.assets
      .map(
        (a) =>
          `<option value="${a.id}" ${task && task.assetId === a.id ? "selected" : !task && a.id === currentAssetId ? "selected" : ""}>${escapeHtml(a.name)}</option>`
      )
      .join("");

    openOverlay(`
      <div class="sheet-handle"></div>
      <h2>${task ? "Edit task" : "Add task"}</h2>
      <form id="task-form">
        <div class="form-group">
          <label for="assetId">Asset</label>
          <select id="assetId" name="assetId" required>${assetOptions}</select>
        </div>
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" required maxlength="80" value="${escapeAttr(task?.title || "")}" placeholder="e.g. Grease hubs" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="category">Category</label>
            <input type="text" id="category" name="category" maxlength="40" value="${escapeAttr(task?.category || "")}" placeholder="Engine, Tires…" />
          </div>
          <div class="form-group">
            <label for="priority">Priority</label>
            <select id="priority" name="priority">
              <option value="low" ${task?.priority === "low" ? "selected" : ""}>Low</option>
              <option value="medium" ${!task || task.priority === "medium" ? "selected" : ""}>Medium</option>
              <option value="high" ${task?.priority === "high" ? "selected" : ""}>High</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="intervalDays">Interval (days)</label>
            <input type="number" id="intervalDays" name="intervalDays" min="1" value="${task?.intervalDays ?? ""}" placeholder="90" />
          </div>
          <div class="form-group">
            <label for="intervalHours">Interval (hours)</label>
            <input type="number" id="intervalHours" name="intervalHours" min="1" value="${task?.intervalHours ?? ""}" placeholder="100" />
          </div>
        </div>
        <div class="form-group">
          <label for="lastDoneAt">Last done</label>
          <input type="date" id="lastDoneAt" name="lastDoneAt" value="${task?.lastDoneAt ? task.lastDoneAt.slice(0, 10) : ""}" />
        </div>
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea id="notes" name="notes" placeholder="Tips, part numbers…">${escapeHtml(task?.notes || "")}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">${task ? "Save changes" : "Add task"}</button>
          ${task ? `<button type="button" class="btn btn-danger btn-block" data-action="delete-task" data-id="${task.id}">Delete task</button>` : ""}
          <button type="button" class="btn btn-ghost btn-block" data-action="close-overlay">Cancel</button>
        </div>
      </form>
    `);
    document.getElementById("task-form").onsubmit = (e) => {
      e.preventDefault();
      saveTask(e.target);
    };
  }

  function openConfirmReset() {
    openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Reset all data?</h2>
      <div class="confirm-box">
        <p>This wipes your tasks, logs, and asset edits and restores the default seed. This cannot be undone — export a backup first if you care.</p>
        <div class="form-actions">
          <button type="button" class="btn btn-danger btn-block" data-action="confirm-reset">Yes, reset everything</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="close-overlay">Cancel</button>
        </div>
      </div>
    `);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function proBannerHTML() {
    return `
      <div class="pro-banner" role="note">
        <div class="pro-icon">Pro</div>
        <div class="pro-body">
          <strong>Dockside Pro — coming soon</strong>
          Full guide library + smarter parts picks — on the horizon
        </div>
      </div>
    `;
  }

  function sortedTasks(tasks) {
    return [...tasks].sort((a, b) => {
      const da = daysUntilDue(a);
      const db = daysUntilDue(b);
      const sa = da === null ? -9999 : da;
      const sb = db === null ? -9999 : db;
      if (sa !== sb) return sa - sb;
      const pr = { high: 0, medium: 1, low: 2 };
      return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1);
    });
  }

  function taskRowHTML(task, opts = {}) {
    const asset = state.assets.find((a) => a.id === task.assetId);
    const st = statusOf(task);
    const showAsset = opts.showAsset !== false;
    return `
      <div class="task-row ${st}" data-task-id="${task.id}">
        <div class="task-main" data-action="open-task" data-id="${task.id}">
          <div class="task-info">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">
              <span class="badge ${st}">${relativeLabel(task)}</span>
              ${showAsset ? `<span>${escapeHtml(asset?.name || "")}</span>` : ""}
              <span class="badge category">${escapeHtml(task.category)}</span>
              ${task.priority === "high" ? `<span class="badge priority-high">High</span>` : ""}
            </div>
          </div>
          <button type="button" class="btn-done" data-action="mark-done" data-id="${task.id}" title="Mark done today">Done</button>
        </div>
      </div>
    `;
  }

  function groupSections(tasks) {
    const overdue = [];
    const dueSoon = [];
    const upcoming = [];
    sortedTasks(tasks).forEach((t) => {
      const st = statusOf(t);
      if (!t.lastDoneAt || st === "overdue") overdue.push(t);
      else if (st === "due-soon") dueSoon.push(t);
      else upcoming.push(t);
    });
    return { overdue, dueSoon, upcoming };
  }

  function sectionsHTML(groups, emptyMsg, opts) {
    const parts = [];
    const renderGroup = (label, cls, list) => {
      if (!list.length) return;
      parts.push(`<div class="section-label ${cls}">${label} <span class="count">${list.length}</span></div>`);
      parts.push(list.map((t) => taskRowHTML(t, opts)).join(""));
    };
    renderGroup("Overdue", "overdue", groups.overdue);
    renderGroup("Due soon", "due-soon", groups.dueSoon);
    renderGroup("Upcoming", "upcoming", groups.upcoming);
    if (!parts.length) {
      return `<div class="empty-state"><div class="empty-icon">✓</div><h3>All clear</h3><p>${emptyMsg}</p></div>`;
    }
    return parts.join("");
  }

  function partsListHTML(parts, asset) {
    if (!parts || !parts.length) {
      return `<p style="font-size:0.85rem;color:var(--text-muted)">No parts listed for this job yet.</p>`;
    }
    const rows = parts
      .map(
        (p) => `
      <div class="part-row">
        <div class="part-info">
          <div class="part-name">${escapeHtml(p.name)}</div>
          <div class="part-why">${escapeHtml(p.why)}</div>
        </div>
        <a class="btn btn-buy" href="${escapeAttr(buyUrlForPart(p, asset))}" target="_blank" rel="noopener noreferrer">Shop</a>
      </div>`
      )
      .join("");
    return rows + affiliateNoteHTML();
  }



  function renderSetup() {
    const boat = getBoat() || {};
    const trailer = getTrailer() || {};
    const editing = state.setupComplete === true;
    const engineType = boat.engineType || "";
    const hpLabel = boat.engineSizeLabel || "";
    let hpPreset = "";
    let hpCustom = "";
    let kwVal = "";
    if (engineType === "electric") {
      if (boat.engineHp != null) kwVal = String(boat.engineHp);
    } else if (hpLabel === "300+ HP") {
      hpPreset = "300+";
    } else if (hpLabel && ENGINE_HP_PRESETS.includes(hpLabel.replace(" HP", ""))) {
      hpPreset = hpLabel.replace(" HP", "");
    } else if (boat.engineHp != null || (hpLabel && hpLabel.endsWith(" HP"))) {
      hpPreset = "custom";
      hpCustom = boat.engineHp != null ? String(boat.engineHp) : hpLabel.replace(" HP", "");
    }

    const hpOptions = ENGINE_HP_PRESETS.map(
      (p) => `<option value="${p}" ${hpPreset === p ? "selected" : ""}>${p} HP</option>`
    ).join("") + `<option value="custom" ${hpPreset === "custom" ? "selected" : ""}>Custom</option>`;

    return `
      <div class="setup-screen">
        <div class="setup-hero">
          <div class="setup-mark">${ICON_ANCHOR}</div>
          <h2>${editing ? "Your gear" : "Welcome to Dockside"}</h2>
          <p>Tell Dockside what you run — we’ll tailor guides and parts.</p>
        </div>
        <form id="setup-form" class="setup-form">
          <div class="form-group setup-field">
            <label for="boatType">Boat type</label>
            <select id="boatType" name="boatType" required class="setup-select">
              <option value="" disabled ${!boat.boatType ? "selected" : ""}>Select boat type</option>
              ${optionsHTML(BOAT_TYPES, boat.boatType || "")}
            </select>
          </div>
          <div class="form-group setup-field">
            <label for="boatMakeModel">Boat make / model <span class="opt-label">encouraged</span></label>
            <input type="text" id="boatMakeModel" name="boatMakeModel" class="setup-select" maxlength="80" placeholder="e.g. Scout 210, Sea Ray 240" value="${escapeAttr(boat.makeModel || "")}" />
          </div>
          <div class="form-group setup-field">
            <label for="engineType">Engine type</label>
            <select id="engineType" name="engineType" required class="setup-select">
              <option value="" disabled ${!boat.engineType ? "selected" : ""}>Select engine type</option>
              ${optionsHTML(ENGINE_TYPES, boat.engineType || "")}
            </select>
          </div>
          <div class="form-group setup-field" id="engine-size-hp" ${engineType === "electric" || engineType === "none" || !engineType ? 'style="display:none"' : ""}>
            <label for="engineHpPreset">Engine size (HP)</label>
            <select id="engineHpPreset" name="engineHpPreset" class="setup-select">
              <option value="">Select HP</option>
              ${hpOptions}
            </select>
          </div>
          <div class="form-group setup-field" id="engine-size-custom" ${hpPreset === "custom" && engineType !== "electric" && engineType !== "none" ? "" : 'style="display:none"'}>
            <label for="engineHpCustom">Custom HP</label>
            <input type="number" id="engineHpCustom" name="engineHpCustom" min="1" step="0.1" placeholder="e.g. 175" value="${escapeAttr(hpCustom)}" class="setup-select" />
          </div>
          <div class="form-group setup-field" id="engine-size-kw" ${engineType === "electric" ? "" : 'style="display:none"'}>
            <label for="engineKw">Motor size (kW) — optional</label>
            <input type="number" id="engineKw" name="engineKw" min="0" step="0.1" placeholder="e.g. 10" value="${escapeAttr(kwVal)}" class="setup-select" />
          </div>
          <div class="form-group setup-field" id="engine-make-model" ${engineType === "none" || !engineType ? 'style="display:none"' : ""}>
            <label for="engineMakeModel">Engine make / model <span class="opt-label">encouraged</span></label>
            <input type="text" id="engineMakeModel" name="engineMakeModel" class="setup-select" maxlength="80" placeholder="e.g. Yamaha F150" value="${escapeAttr(boat.engineMakeModel || "")}" />
          </div>
          <div class="form-group setup-field">
            <label for="trailerType">Trailer type</label>
            <select id="trailerType" name="trailerType" required class="setup-select">
              <option value="" disabled ${!trailer.trailerType ? "selected" : ""}>Select trailer type</option>
              ${optionsHTML(TRAILER_TYPES, trailer.trailerType || "")}
            </select>
          </div>
          <div class="form-group setup-field" id="trailer-make-model" ${trailer.trailerType === "none" ? 'style="display:none"' : ""}>
            <label for="trailerMakeModel">Trailer make / model <span class="opt-label">optional</span></label>
            <input type="text" id="trailerMakeModel" name="trailerMakeModel" class="setup-select" maxlength="80" placeholder="e.g. Load Rite, Magic Tilt" value="${escapeAttr(trailer.makeModel || "")}" />
          </div>
          <button type="submit" class="btn btn-primary btn-block setup-cta">
            ${editing ? "Save gear" : "Save & see my schedule"}
          </button>
          ${editing ? `<button type="button" class="btn btn-ghost btn-block" data-action="go-back" style="margin-top:8px">Cancel</button>` : ""}
        </form>
      </div>
    `;
  }

  function renderTrack() {
    let tasks = visibleTasks(state.tasks);
    if (filterAssetId !== "all") {
      tasks = tasks.filter((t) => t.assetId === filterAssetId);
    }
    const groups = groupSections(tasks);
    const chips = [
      `<button type="button" class="chip ${filterAssetId === "all" ? "active" : ""}" data-action="filter-asset" data-id="all">All</button>`,
      ...state.assets.map(
        (a) =>
          `<button type="button" class="chip ${filterAssetId === a.id ? "active" : ""}" data-action="filter-asset" data-id="${a.id}">${escapeHtml(a.name)}</button>`
      ),
    ].join("");

    return `
      ${yourGearCardHTML()}
      <div class="stats-strip">
        <div class="stat-pill overdue"><div class="num">${groups.overdue.length}</div><div class="lbl">Overdue</div></div>
        <div class="stat-pill due-soon"><div class="num">${groups.dueSoon.length}</div><div class="lbl">Due soon</div></div>
        <div class="stat-pill ok"><div class="num">${groups.upcoming.length}</div><div class="lbl">Upcoming</div></div>
      </div>
      <div class="asset-chips">${chips}</div>
      <div class="cta-row">
        <button type="button" class="btn btn-primary" data-action="add-task">+ Add task</button>
        <button type="button" class="btn btn-secondary" data-action="goto-assets">Assets</button>
      </div>
      ${sectionsHTML(groups, "Nothing due in this filter. Add a task or check another asset.", { showAsset: filterAssetId === "all" })}
    `;
  }

    function renderGuides() {
    const incomplete = needsSetup(state);
    const boat = getBoat();
    const trailer = getTrailer();
    let tasks = visibleTasks(state.tasks).filter((t) => Array.isArray(t.steps) && t.steps.length > 0);
    if (guidesFilter === "boat" || guidesFilter === "trailer") {
      tasks = tasks.filter((t) => {
        const a = state.assets.find((x) => x.id === t.assetId);
        return a && a.type === guidesFilter;
      });
    }
    tasks = [...tasks].sort((a, b) => a.title.localeCompare(b.title));

    const boatLabel = boat?.makeModel || (boat?.boatType ? boatTypeLabel(boat.boatType) : "boat");
    const trailerLabel =
      trailer?.makeModel ||
      (trailer?.trailerType && trailer.trailerType !== "none"
        ? trailerTypeLabel(trailer.trailerType)
        : "trailer");

    let header = "";
    if (!incomplete) {
      if (guidesFilter === "trailer") {
        header = `<div class="view-hero"><h2>Fix your ${escapeHtml(trailerLabel)}</h2><p>Step-by-step for your trailer — then shop the parts.</p></div>`;
      } else if (guidesFilter === "boat") {
        header = `<div class="view-hero"><h2>Fix your ${escapeHtml(boatLabel)}</h2><p>Step-by-step for your boat — then shop the parts.</p></div>`;
      } else {
        header = `<div class="view-hero"><h2>Fix your ${escapeHtml(boatLabel)}</h2><p class="view-hero-sub">Also: fix your ${escapeHtml(trailerLabel)}</p><p>How-tos matched to what you run — shop parts for each job.</p></div>`;
      }
    } else {
      header = `<div class="view-hero"><h2>Fix your boat &amp; trailer</h2><p>Add your gear so guides match what you run.</p></div>`;
    }

    const chips = `
      <button type="button" class="chip ${guidesFilter === "all" ? "active" : ""}" data-action="filter-guides" data-id="all">All</button>
      <button type="button" class="chip ${guidesFilter === "boat" ? "active" : ""}" data-action="filter-guides" data-id="boat">Boat</button>
      <button type="button" class="chip ${guidesFilter === "trailer" ? "active" : ""}" data-action="filter-guides" data-id="trailer">Trailer</button>
    `;

    const list = tasks.length
      ? tasks
          .map((t, i) => {
            const asset = state.assets.find((a) => a.id === t.assetId);
            const n = t.steps.length;
            const pc = (t.parts || []).length;
            const tq = (t.torqueSpecs || []).length;
            const badge = asset?.type === "trailer" ? "Trailer" : "Boat";
            const num = String(i + 1).padStart(2, "0");
            return `
            <div class="guide-row" data-action="open-guide" data-id="${t.id}">
              <div class="guide-num">${num}</div>
              <div class="guide-info">
                <div class="guide-title">${escapeHtml(t.title)}</div>
                <div class="guide-meta">
                  <span class="badge for-you">${badge}</span>
                  ${n} steps${tq ? ` · ${tq} torque` : ""}${pc ? ` · ${pc} parts` : ""}
                </div>
              </div>
              <span class="chevron">›</span>
            </div>`;
          })
          .join("")
      : `<div class="empty-state"><div class="empty-icon">01</div><h3>No guides yet</h3><p>Seeded tasks include how-tos. Reset data in Settings if needed.</p></div>`;

    return `
      ${incomplete ? addGearCTAHTML(true) : ""}
      ${header}
      ${proBannerHTML()}
      <div class="asset-chips">${chips}</div>
      <div class="section-label">How-to guides <span class="count">${tasks.length}</span></div>
      ${list}
    `;
  }

  function renderParts() {
    const incomplete = needsSetup(state);
    const boat = getBoat();
    const byAsset = {};
    state.assets.forEach((a) => {
      byAsset[a.id] = [];
    });

    visibleTasks(state.tasks).forEach((t) => {
      (t.parts || []).forEach((pt) => {
        const bucket = byAsset[t.assetId] || (byAsset[t.assetId] = []);
        bucket.push({ part: pt, task: t });
      });
    });

    let engineHeader = "Parts for your boat";
    if (!incomplete && boat) {
      const size = boat.engineSizeLabel || "";
      const eng =
        boat.engineMakeModel ||
        (boat.engineType && boat.engineType !== "none" ? engineTypeLabel(boat.engineType) : "");
      if (size || eng) {
        engineHeader = `Parts for your ${[size, eng].filter(Boolean).join(" ")}`.trim();
      } else if (boat.makeModel) {
        engineHeader = `Parts for your ${boat.makeModel}`;
      }
    }

    let total = 0;
    const sections = state.assets
      .map((a) => {
        const items = byAsset[a.id] || [];
        total += items.length;
        if (!items.length) return "";
        const sectionTitle =
          a.type === "boat" ? "For your boat" : a.type === "trailer" ? "For your trailer" : a.name;
        return `
          <div class="section-label">${escapeHtml(sectionTitle)} <span class="count">${items.length}</span></div>
          ${items
            .map(
              (row) => `
            <div class="part-row">
              <div class="part-info">
                <div class="part-name">${escapeHtml(row.part.name)}</div>
                <div class="part-why">${escapeHtml(row.part.why)}</div>
                <div class="part-task">${escapeHtml(row.task.title)}</div>
              </div>
              <a class="btn btn-buy" href="${escapeAttr(buyUrlForPart(row.part, a))}" target="_blank" rel="noopener noreferrer">Shop</a>
            </div>`
            )
            .join("")}`;
      })
      .join("");

    const header = incomplete
      ? `<div class="view-hero"><h2>Parts for your boat &amp; trailer</h2><p>Add your gear so buy links match your engine and trailer.</p></div>`
      : `<div class="view-hero"><h2>${escapeHtml(engineHeader)}</h2><p>Shop Amazon for the job — make/model included when you add it.</p></div>`;

    return `
      ${incomplete ? addGearCTAHTML(true) : ""}
      ${header}
      ${proBannerHTML()}
      ${
        total
          ? sections + affiliateNoteHTML()
          : `<div class="empty-state"><div class="empty-icon">◎</div><h3>No parts yet</h3><p>Seeded jobs include buy links. Reset in Settings if your data is empty.</p></div>`
      }
    `;
  }

  function renderGear() {
    const incomplete = needsSetup(state);
    const overdue = visibleTasks(state.tasks).filter((t) => statusOf(t) === "overdue" || !t.lastDoneAt).length;
    const summary = incomplete ? "Not set up yet" : gearSummaryLabel();
    return `
      ${yourGearCardHTML()}
      <div class="section-label">Gear hub</div>
      <div class="more-menu-item" data-action="goto-setup">
        <div class="mm-icon">Ed</div>
        <div class="mm-body">
          <div class="mm-title">${incomplete ? "Add boat, engine & trailer" : "Edit boat, engine & trailer"}</div>
          <div class="mm-sub">${escapeHtml(summary)}</div>
        </div>
        <span class="chevron">›</span>
      </div>
      <div class="more-menu-item" data-action="goto-assets">
        <div class="mm-icon">As</div>
        <div class="mm-body">
          <div class="mm-title">Assets</div>
          <div class="mm-sub">${state.assets.length} assets · ${overdue ? overdue + " overdue tasks" : "on track"}</div>
        </div>
        <span class="chevron">›</span>
      </div>
      <div class="more-menu-item" data-action="goto-settings">
        <div class="mm-icon">St</div>
        <div class="mm-body">
          <div class="mm-title">Settings</div>
          <div class="mm-sub">Rename assets, backup, reset</div>
        </div>
        <span class="chevron">›</span>
      </div>
      <p class="build-footer">
        Dockside · ${BUILD} · Track. Fix. Buy.
      </p>
    `;
  }


  function renderAssets() {
    return `
      <div class="section-label">Your assets</div>
      ${state.assets
        .map((a) => {
          const n = visibleTasks(state.tasks).filter((t) => t.assetId === a.id).length;
          const overdue = visibleTasks(state.tasks).filter((t) => t.assetId === a.id && (statusOf(t) === "overdue" || !t.lastDoneAt)).length;
          return `
            <div class="card" style="cursor:pointer" data-action="goto-asset" data-id="${a.id}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div>
                  <div style="font-weight:700;font-size:1.05rem">${escapeHtml(a.name)}</div>
                  <div style="display:inline-block;margin-top:6px;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--teal);background:var(--teal-bg);padding:3px 10px;border-radius:999px">${escapeHtml(a.type)}</div>
                </div>
                <div style="text-align:right;font-size:0.8rem;color:var(--text-muted)">
                  <div>${n} tasks</div>
                  ${overdue ? `<div style="color:var(--rose);font-weight:600">${overdue} overdue</div>` : `<div style="color:var(--teal)">On track</div>`}
                </div>
              </div>
              ${a.notes ? `<p style="margin-top:10px;font-size:0.85rem;color:var(--text-muted)">${escapeHtml(a.notes)}</p>` : ""}
              <div class="meter-row">
                ${a.type === "boat" ? `<div><span>Hours </span><strong>${a.hourMeter ?? "—"}</strong></div>` : ""}
                ${a.type === "trailer" ? `<div><span>Miles </span><strong>${a.odometer ?? "—"}</strong></div>` : ""}
              </div>
            </div>
          `;
        })
        .join("")}
      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;text-align:center">Rename assets in Settings</p>
    `;
  }

  function renderAssetDetail() {
    const asset = state.assets.find((a) => a.id === currentAssetId);
    if (!asset) {
      return `<div class="empty-state"><h3>Asset not found</h3><button class="btn btn-secondary" data-action="goto-assets">Back</button></div>`;
    }
    const tasks = visibleTasks(state.tasks).filter((t) => t.assetId === asset.id);
    const groups = groupSections(tasks);
    const gearBits = [];
    if (asset.type === "boat") {
      if (asset.boatType) gearBits.push(boatTypeLabel(asset.boatType));
      if (asset.engineType === "none") gearBits.push("No engine");
      else if (asset.engineType) {
        const eng = engineTypeLabel(asset.engineType);
        gearBits.push(asset.engineSizeLabel ? `${asset.engineSizeLabel} ${eng}` : eng);
      }
    }
    if (asset.type === "trailer" && asset.trailerType) {
      gearBits.push(trailerTypeLabel(asset.trailerType));
    }
    return `
      <div class="asset-hero">
        <h2>${escapeHtml(asset.name)}</h2>
        <span class="type-tag">${escapeHtml(asset.type)}</span>
        ${gearBits.length ? `<div class="notes">${escapeHtml(gearBits.join(" · "))}</div>` : ""}
        ${asset.notes ? `<div class="notes">${escapeHtml(asset.notes)}</div>` : ""}
        <div class="meter-row">
          ${asset.type === "boat" ? `<div><span>Hour meter </span><strong>${asset.hourMeter ?? "—"}</strong></div>` : ""}
          ${asset.type === "trailer" ? `<div><span>Odometer </span><strong>${asset.odometer ?? "—"}</strong></div>` : ""}
        </div>
      </div>
      <div class="cta-row">
        <button type="button" class="btn btn-primary" data-action="add-task">+ Add task</button>
        <button type="button" class="btn btn-ghost" data-action="goto-assets">All assets</button>
      </div>
      ${sectionsHTML(groups, "No tasks yet. Tap Add task to create one.", { showAsset: false })}
    `;
  }


  function guideModelCallout(asset) {
    if (!asset) return "";
    const bits = [];
    if (asset.type === "boat") {
      if (asset.engineMakeModel) bits.push(asset.engineMakeModel);
      if (asset.makeModel) bits.push(asset.makeModel);
    } else if (asset.type === "trailer") {
      if (asset.makeModel) bits.push(asset.makeModel);
    }
    if (!bits.length) return "";
    const label = bits.join(" · ");
    return `<div class="guide-model-callout">You entered <strong>${escapeHtml(label)}</strong> — confirm torque and capacities in that manual before tightening.</div>`;
  }

  function renderGuideBody(task, asset) {
    const steps = Array.isArray(task.steps) ? task.steps : [];
    const tools = Array.isArray(task.tools) ? task.tools : [];
    const torque = Array.isArray(task.torqueSpecs) ? task.torqueSpecs : [];
    const warnings = Array.isArray(task.warnings) ? task.warnings : [];
    const fluids = Array.isArray(task.fluids) ? task.fluids : [];
    const forWhat = asset?.type === "trailer" ? "trailer" : "boat";
    const assetName = asset?.name || forWhat;

    if (!steps.length && !tools.length && !torque.length && !warnings.length) {
      return `<p class="guide-empty">No how-to steps for this task yet. Seeded jobs include guides — or add notes while you work.</p>`;
    }

    let html = "";
    html += `<div class="guide-kicker">For your ${escapeHtml(assetName)}</div>`;
    html += guideModelCallout(asset);
    html += `<p class="guide-verify-banner">Torque &amp; capacities below are <strong>typical</strong> — verify in your OEM service manual before tightening.</p>`;

    if (warnings.length) {
      html += `<div class="guide-warnings"><div class="guide-sec-title">Warnings</div><ul>${warnings
        .map((w) => `<li>${escapeHtml(w)}</li>`)
        .join("")}</ul></div>`;
    }

    if (tools.length) {
      html += `<div class="guide-tools"><div class="guide-sec-title">Tools</div><div class="tool-chips">${tools
        .map((t) => `<span class="tool-chip">${escapeHtml(t)}</span>`)
        .join("")}</div></div>`;
    }

    if (torque.length) {
      html += `<div class="guide-torque"><div class="guide-sec-title">Torque specs <span class="guide-sec-sub">Typical — verify OEM</span></div>`;
      html += `<div class="torque-table" role="table">`;
      html += `<div class="torque-head" role="row"><span>Part</span><span>Spec</span><span>Note</span></div>`;
      torque.forEach((row) => {
        html += `<div class="torque-row" role="row">
          <span class="tq-part">${escapeHtml(row.part || "")}</span>
          <span class="tq-spec">${escapeHtml(row.spec || "")}</span>
          <span class="tq-note">${escapeHtml(row.note || "")}</span>
        </div>`;
      });
      html += `</div></div>`;
    }

    if (steps.length) {
      html += `<div class="guide-steps-wrap"><div class="guide-sec-title">Step-by-step</div>`;
      html += `<ol class="howto-steps">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol></div>`;
    }

    if (fluids.length) {
      html += `<div class="guide-fluids"><div class="guide-sec-title">Fluids <span class="guide-sec-sub">Typical — verify capacity</span></div><ul>${fluids
        .map((f) => `<li>${escapeHtml(f)}</li>`)
        .join("")}</ul></div>`;
    }

    return html;
  }

  function renderTaskDetail() {
    const task = state.tasks.find((t) => t.id === currentTaskId);
    if (!task) {
      return `<div class="empty-state"><h3>Task not found</h3><button class="btn btn-secondary" data-action="go-back">Back</button></div>`;
    }
    const asset = state.assets.find((a) => a.id === task.assetId);
    const st = statusOf(task);
    const due = nextDue(task);
    const parts = Array.isArray(task.parts) ? task.parts : [];
    const focusGuide = taskDetailFocus === "guide";

    return `
      <div class="detail-hero">
        <h2>${escapeHtml(task.title)}</h2>
        <div class="task-meta">
          <span class="badge ${st}">${relativeLabel(task)}</span>
          <span class="badge category">${escapeHtml(task.category)}</span>
          ${task.priority === "high" ? `<span class="badge priority-high">High</span>` : ""}
          <span>${escapeHtml(asset?.name || "")}</span>
        </div>
        <div class="detail-schedule">
          <div class="row"><span class="lbl">Schedule</span><span class="val">${escapeHtml(intervalLabel(task))}</span></div>
          <div class="row"><span class="lbl">Last done</span><span class="val">${task.lastDoneAt ? escapeHtml(task.lastDoneAt.slice(0, 10)) : "Never"}</span></div>
          <div class="row"><span class="lbl">Next due</span><span class="val">${due ? escapeHtml(due) : "—"}</span></div>
        </div>
        ${task.notes ? `<div class="task-notes" style="margin-bottom:0">${escapeHtml(task.notes)}</div>` : ""}
        <div class="cta-row" style="margin-top:14px;margin-bottom:0">
          <button type="button" class="btn btn-primary" data-action="mark-done" data-id="${task.id}">Mark done</button>
          <button type="button" class="btn btn-secondary" data-action="open-log" data-id="${task.id}">Log details</button>
        </div>
        <div class="cta-row" style="margin-top:8px;margin-bottom:0">
          <button type="button" class="btn btn-ghost btn-block" data-action="edit-task" data-id="${task.id}">Edit task</button>
        </div>
      </div>

      <div class="howto-block ${focusGuide ? "highlight" : ""}" id="howto-section">
        <h3><span class="sec-mark">DIY</span> How-to guide</h3>
        ${renderGuideBody(task, asset)}
      </div>

      <div class="parts-block shop-block">
        <h3><span class="sec-mark">Buy</span> Shop parts for this job</h3>
        ${partsListHTML(parts, asset)}
      </div>
    `;
  }

  function renderSettings() {
    const assetForms = state.assets
      .map(
        (a) => `
      <div class="asset-edit-card">
        <div class="form-group">
          <label>Name (${escapeHtml(a.type)})</label>
          <input type="text" name="name_${a.id}" value="${escapeAttr(a.name)}" maxlength="60" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea name="notes_${a.id}" rows="2">${escapeHtml(a.notes || "")}</textarea>
        </div>
        <div class="form-row">
          ${
            a.type === "boat"
              ? `<div class="form-group"><label>Hour meter</label><input type="number" name="hour_${a.id}" min="0" step="0.1" value="${a.hourMeter ?? ""}" placeholder="0" /></div>`
              : `<div class="form-group"><label>Odometer (mi)</label><input type="number" name="odo_${a.id}" min="0" step="1" value="${a.odometer ?? ""}" placeholder="0" /></div>`
          }
          <div class="form-group"><label>Type</label><input type="text" value="${escapeAttr(a.type)}" disabled /></div>
        </div>
      </div>`
      )
      .join("");

    return `
      <form id="settings-form">
        <div class="settings-block">
          <h3>⚓ Your gear</h3>
          <p class="hint">${state.setupComplete ? escapeHtml(gearSummaryLabel()) : "Not set up yet"}</p>
          <button type="button" class="btn btn-secondary btn-block" data-action="goto-setup">Edit boat, engine & trailer</button>
        </div>
        <div class="settings-block">
          <h3>🚤 Assets</h3>
          <p class="hint">Edit names, notes, and meters. Changes save when you tap Save assets.</p>
          ${assetForms}
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">Save assets</button>
        </div>
      </form>
      <div class="settings-block">
        <h3>💾 Backup</h3>
        <p class="hint">Export JSON to keep a copy. Import to restore on this or another device (same browser storage).</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button type="button" class="btn btn-secondary btn-block" data-action="export">Export JSON</button>
          <label class="btn btn-ghost btn-block" style="cursor:pointer">
            Import JSON
            <input type="file" accept="application/json,.json" class="sr-only" id="import-file" />
          </label>
        </div>
      </div>
      <div class="settings-block">
        <h3>⚠️ Danger zone</h3>
        <p class="hint">Reset restores default seed tasks for Boat + Trailer with guides and parts.</p>
        <button type="button" class="btn btn-danger btn-block" data-action="reset-prompt">Reset all data</button>
      </div>
      <p style="text-align:center;font-size:0.75rem;color:var(--text-dim);margin-top:16px">
        Dockside · build ${BUILD} · data: ${STORAGE_KEY}
      </p>
    `;
  }


  function headerTitle() {
    if (currentView === "setup") return state.setupComplete ? "Your gear" : "Setup";
    if (currentView === "track") return "Dockside";
    if (currentView === "guides") return "Guides";
    if (currentView === "parts") return "Parts";
    if (currentView === "gear") return "Gear";
    if (currentView === "assets") return "Assets";
    if (currentView === "settings") return "Settings";
    if (currentView === "asset") {
      const a = state.assets.find((x) => x.id === currentAssetId);
      return a ? a.name : "Asset";
    }
    if (currentView === "task") {
      const t = state.tasks.find((x) => x.id === currentTaskId);
      return t ? t.title : "Task";
    }
    return "Dockside";
  }

  function render() {
    const main = document.getElementById("main");
    const title = document.getElementById("header-title");
    const tagline = document.getElementById("header-tagline");
    title.textContent = headerTitle();
    tagline.classList.toggle("hidden", currentView !== "track");
    tagline.textContent = "Track. Fix. Buy.";

    let html = "";
    if (currentView === "setup") html = renderSetup();
    else if (currentView === "track") html = renderTrack();
    else if (currentView === "guides") html = renderGuides();
    else if (currentView === "parts") html = renderParts();
    else if (currentView === "gear") html = renderGear();
    else if (currentView === "assets") html = renderAssets();
    else if (currentView === "asset") html = renderAssetDetail();
    else if (currentView === "task") html = renderTaskDetail();
    else if (currentView === "settings") html = renderSettings();

    main.innerHTML = html;

    document.getElementById("app").classList.toggle("setup-mode", currentView === "setup" && !state.setupComplete);

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      const v = btn.dataset.view;
      let active =
        (v === "track" && currentView === "track") ||
        (v === "guides" && currentView === "guides") ||
        (v === "parts" && currentView === "parts") ||
        (v === "gear" &&
          (currentView === "gear" ||
            currentView === "assets" ||
            currentView === "asset" ||
            currentView === "settings" ||
            currentView === "setup"));
      if (currentView === "task") {
        if (taskDetailFocus === "guide") {
          active = v === "guides";
        } else {
          active = v === "track";
        }
      }
      btn.classList.toggle("active", !!active);
    });

    const sf = document.getElementById("settings-form");
    if (sf) {
      sf.onsubmit = (e) => {
        e.preventDefault();
        saveAssets(e.target);
      };
    }
    const setupForm = document.getElementById("setup-form");
    if (setupForm) {
      setupForm.onsubmit = (e) => {
        e.preventDefault();
        saveSetup(e.target);
      };
      const engSel = setupForm.engineType;
      const hpPreset = setupForm.engineHpPreset;
      const syncEngineSize = () => {
        const et = engSel.value;
        const hpBlock = document.getElementById("engine-size-hp");
        const customBlock = document.getElementById("engine-size-custom");
        const kwBlock = document.getElementById("engine-size-kw");
        const engMake = document.getElementById("engine-make-model");
        if (hpBlock) hpBlock.style.display = et && et !== "none" && et !== "electric" ? "" : "none";
        if (kwBlock) kwBlock.style.display = et === "electric" ? "" : "none";
        if (engMake) engMake.style.display = et && et !== "none" ? "" : "none";
        if (customBlock) {
          customBlock.style.display =
            et && et !== "none" && et !== "electric" && hpPreset?.value === "custom" ? "" : "none";
        }
      };
      const syncTrailerMake = () => {
        const tt = setupForm.trailerType?.value;
        const block = document.getElementById("trailer-make-model");
        if (block) block.style.display = tt && tt !== "none" ? "" : "none";
      };
      if (engSel) engSel.addEventListener("change", syncEngineSize);
      if (hpPreset) hpPreset.addEventListener("change", syncEngineSize);
      if (setupForm.trailerType) setupForm.trailerType.addEventListener("change", syncTrailerMake);
    }
    const imp = document.getElementById("import-file");
    if (imp) {
      imp.onchange = () => {
        if (imp.files?.[0]) importJSON(imp.files[0]);
      };
    }

    // Back / add / nav visibility for setup
    const back = document.getElementById("btn-back");
    const showBack =
      ["asset", "task", "settings", "assets"].includes(currentView) ||
      (currentView === "setup" && state.setupComplete);
    back.classList.toggle("hidden", !showBack);
    const addBtn = document.getElementById("btn-add");
    addBtn.classList.toggle("hidden", currentView === "setup" || !["track", "asset", "assets"].includes(currentView));
  }

  function onClick(e) {
    if (e.target.closest("a.btn-shop")) return;

    const t = e.target.closest("[data-action]");
    if (!t) return;
    const action = t.dataset.action;
    const id = t.dataset.id;

    switch (action) {
      case "mark-done":
        e.stopPropagation();
        markDoneQuick(id);
        break;
      case "open-task":
        navigate("task", { taskId: id, focus: null, pushHistory: true });
        break;
      case "open-guide":
        navigate("task", { taskId: id, focus: "guide", pushHistory: true });
        break;
      case "open-log":
        openLogSheet(id);
        break;
      case "edit-task":
        openTaskForm(id);
        break;
      case "add-task":
        openTaskForm(null);
        break;
      case "delete-task":
        if (confirm("Delete this task?")) deleteTask(id);
        break;
      case "close-overlay":
        closeOverlay();
        break;
      case "filter-asset":
        filterAssetId = id;
        render();
        break;
      case "filter-guides":
        guidesFilter = id;
        render();
        break;
      case "goto-gear":
        navigate("gear", { clearHistory: true });
        break;
      case "goto-assets":
        navigate("assets", { pushHistory: currentView === "gear" });
        break;
      case "goto-asset":
        navigate("asset", { assetId: id, pushHistory: true });
        break;
      case "goto-settings":
        navigate("settings", { pushHistory: true });
        break;
      case "goto-setup":
        navigate("setup", { pushHistory: state.setupComplete && currentView !== "setup" });
        break;
      case "go-back":
        goBack();
        break;
      case "export":
        exportJSON();
        break;
      case "reset-prompt":
        openConfirmReset();
        break;
      case "confirm-reset":
        resetData();
        break;
      default:
        break;
    }
  }

  function init() {
    document.getElementById("app").addEventListener("click", onClick);

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.view;
        navHistory = [];
        taskDetailFocus = null;
        currentTaskId = null;
        if (v === "track") navigate("track", { clearHistory: true });
        else if (v === "guides") navigate("guides", { clearHistory: true });
        else if (v === "parts") navigate("parts", { clearHistory: true });
        else if (v === "gear") navigate("gear", { clearHistory: true });
      });
    });

    document.getElementById("btn-back").addEventListener("click", goBack);
    document.getElementById("btn-add").addEventListener("click", () => openTaskForm(null));

    const hash = location.hash.replace("#", "");
    if (needsSetup(state)) {
      currentView = "setup";
    } else if (hash === "settings") currentView = "settings";
    else if (hash === "assets") currentView = "assets";
    else if (hash === "guides") currentView = "guides";
    else if (hash === "parts") currentView = "parts";
    else if (hash === "gear" || hash === "more") currentView = "gear";
    else if (hash === "setup") currentView = "setup";

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
