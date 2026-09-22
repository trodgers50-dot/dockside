/**
 * Dockside — Track. Fix. Buy.
 * Boat + trailer maintenance product MVP
 * localStorage key: boatTrailerMaint.v1
 */
(function () {
  "use strict";

  const STORAGE_KEY = "boatTrailerMaint.v1";
  const DUE_SOON_DAYS = 14;

  const BUILD = "v1-setup";

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
    if (boat?.boatType) parts.push(boatTypeLabel(boat.boatType));
    if (boat?.engineType) {
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
    if (trailer?.trailerType) {
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
    return { id, name, why, url: amazonSearch(search) };
  }


  // Catalog of how-to + parts keyed by task title (for seed + migration)
  const GUIDE_CATALOG = {
    "Engine oil & filter": {
      steps: [
        "Warm the engine briefly, then shut off and let it sit a few minutes so oil drains cleanly.",
        "Place a drain pan under the oil drain; remove the drain plug and drain fully. Replace the crush washer if fitted.",
        "Remove the old oil filter; wipe the mount, oil the new filter gasket, and install hand-tight per spec.",
        "Refill with the manufacturer’s oil grade and capacity. Run, check for leaks, and re-check the dipstick.",
        "Dispose of used oil and filter at a recycling center — never on the ground or in trash.",
      ],
      parts: [
        part("oil-filter", "Marine oil filter", "Matches your engine’s filter size", "marine boat oil filter"),
        part("engine-oil", "FC-W marine engine oil", "Correct viscosity for outboards/inboards", "FC-W marine engine oil"),
        part("oil-drain-pan", "Oil drain pan", "Catch used oil without spills", "oil drain pan"),
      ],
    },
    "Lower unit / gearcase oil": {
      steps: [
        "Safety first: prop cleared, engine off, key out. Work on a level trailer or stand.",
        "Remove the lower (drain) plug first, then the upper (vent) plug so oil drains freely.",
        "Inspect drained oil: milky = water intrusion; metal flakes = bearing/gear wear — investigate before refill.",
        "Pump fresh gearcase oil in through the drain hole until it seeps from the vent, then install plugs.",
        "Wipe the case clean and check for leaks after a short run.",
      ],
      parts: [
        part("gear-oil", "Lower unit gear oil", "Marine-rated gear lube for the case", "boat lower unit gear oil"),
        part("gear-oil-pump", "Gear oil pump bottle", "Fill from the bottom without air pockets", "gear oil pump bottle"),
        part("drain-gaskets", "Lower unit drain plug gaskets", "Fresh seals prevent leaks", "outboard drain plug gasket"),
      ],
    },
    "Impeller / water pump": {
      steps: [
        "Confirm cooling water is flowing at idle (tell-tale). No stream or overheat warning → stop and inspect.",
        "Drop the lower unit per the service manual; support the housing so it doesn’t hang on the driveshaft.",
        "Open the water pump housing; note impeller orientation; remove old impeller, wear plate, and gaskets.",
        "Install new impeller (lube lightly with dish soap or assembly lube), new gaskets/O-rings, and torque bolts evenly.",
        "Reinstall the lower unit, align splines carefully, and verify tell-tale flow before high RPM.",
      ],
      parts: [
        part("impeller", "Water pump impeller kit", "Rubber vanes wear out — replace on schedule", "boat impeller water pump kit"),
        part("pump-gasket", "Water pump gasket / housing kit", "Seals the pump against leaks", "outboard water pump gasket kit"),
        part("impeller-grease", "Impeller / assembly lube", "Eases install without damaging vanes", "impeller installation lubricant"),
      ],
    },
    "Fuel filter / water separator": {
      steps: [
        "Work outside or in a ventilated area; no sparks or smoking. Have absorbent pads ready.",
        "Close the fuel shutoff if fitted. Place a pan under the separator bowl.",
        "Drain water from the bowl via the petcock; dispose of fuel/water mix properly.",
        "Replace the filter element; lubricate new O-rings with a dab of fuel or approved grease.",
        "Open fuel, prime the system, check for leaks, and start — watch for air in lines.",
      ],
      parts: [
        part("fuel-filter", "Fuel filter / water separator", "Removes water and debris before the engine", "boat fuel water separator filter"),
        part("fuel-filter-wrench", "Filter wrench", "Removes stubborn spin-on housings", "fuel filter wrench"),
        part("absorbent-pads", "Fuel absorbent pads", "Catch drips safely during service", "fuel absorbent pads"),
      ],
    },
    "Battery & connections": {
      steps: [
        "Wear eye protection. Disconnect negative first, then positive. Never short across terminals.",
        "Clean terminals and cable ends with a wire brush; neutralize corrosion with baking soda solution, rinse, dry.",
        "Inspect cables for frays and swollen insulation; replace damaged leads.",
        "Reconnect positive first, then negative. Apply dielectric grease or terminal protectant.",
        "Check resting voltage (~12.6V+ charged) and charger/combiner function.",
      ],
      parts: [
        part("terminal-cleaner", "Battery terminal cleaner", "Removes corrosion for solid contact", "battery terminal cleaner brush"),
        part("dielectric-grease", "Dielectric grease", "Protects terminals from corrosion", "dielectric grease marine"),
        part("battery-tender", "Marine battery tender", "Keeps batteries topped between trips", "marine battery tender charger"),
        part("terminal-protectors", "Terminal protector felt washers", "Extra corrosion barrier", "battery terminal protector washers"),
      ],
    },
    "Zincs / anodes": {
      steps: [
        "Identify anode locations: shaft, trim tabs, outdrive, hull fittings — match metal (zinc/alum/mag) to water type.",
        "Remove anodes that are ~50% or more consumed, loose, or painted over (paint kills protection).",
        "Clean the mounting surface to bare metal for good electrical contact.",
        "Install new anodes with correct fasteners; snug firmly but don’t strip threads.",
        "Log replacement date; recheck after the next haul-out or mid-season.",
      ],
      parts: [
        part("shaft-zinc", "Shaft / prop shaft anode", "Sacrificial protection for underwater metal", "boat shaft zinc anode"),
        part("outdrive-anode", "Outdrive / trim tab anode kit", "Protects sterndrive and trim hardware", "outdrive anode kit"),
        part("anode-bolts", "Stainless anode bolts", "Secure mount without galvanic issues", "stainless anode mounting bolts"),
      ],
    },
    "Hull wash & wax": {
      steps: [
        "Rinse salt and grit with fresh water before scrubbing so you don’t grind abrasives into gelcoat.",
        "Wash with a marine boat soap and soft brush or mitt; avoid harsh dish detergents long-term.",
        "Rinse thoroughly and dry with a chamois or microfiber to prevent water spots.",
        "Apply marine wax or polish above the waterline in the shade; buff per product directions.",
        "Inspect for blisters, cracks, or fouling while you’re there — note anything for haul-out.",
      ],
      parts: [
        part("boat-soap", "Marine boat soap", "Safe cleaner for gelcoat and vinyl", "marine boat soap wash"),
        part("marine-wax", "Marine wax / polish", "UV protection and shine above waterline", "marine boat wax"),
        part("microfiber", "Microfiber wash & buff towels", "Scratch-safer drying and polishing", "microfiber boat towels"),
      ],
    },
    "Winterize / dewinterize": {
      steps: [
        "Stabilize fuel, run the engine briefly, then fog cylinders per manual if laying up.",
        "Drain raw-water cooling or pump non-toxic marine antifreeze through until pink shows at the exhaust.",
        "Change gearcase oil if due; charge and disconnect or maintain batteries on a tender.",
        "Drain or protect freshwater systems; leave drain plugs out if stored on land.",
        "Cover with a breathable cover; on spring dewinterize reverse the checklist and verify cooling/tell-tale.",
      ],
      parts: [
        part("antifreeze", "Marine antifreeze (-50°)", "Non-toxic propylene glycol for winterizing", "marine antifreeze propylene glycol"),
        part("fogging-oil", "Fogging oil", "Protects cylinders during storage", "marine fogging oil"),
        part("fuel-stabilizer", "Fuel stabilizer", "Prevents varnish in stored fuel", "marine fuel stabilizer"),
      ],
    },
    "Drain plugs check": {
      steps: [
        "Before every launch: visually confirm drain plugs are installed and snug — a 10-second habit that saves sinkings.",
        "Inspect O-rings/gaskets for cracks; replace if flattened or torn.",
        "After haul-out, remove plugs to drain bilge water; store plugs in a known pocket or clip.",
        "Never launch if you’re unsure — walk the hull and feel for plugs before backing in.",
      ],
      parts: [
        part("drain-plugs", "Boat drain plugs (pair)", "Spare set so you’re never stuck at the ramp", "boat drain plugs"),
        part("drain-orings", "Drain plug O-rings", "Fresh seals prevent leaks underway", "boat drain plug o-ring"),
      ],
    },

    "Hub bearings / grease": {
      steps: [
        "After a tow, carefully feel hub temperature (use infrared if available) — hot hubs mean failing bearings.",
        "Jack and support the trailer safely; remove the dust cap or Bearing Buddy.",
        "Check for play by rocking the wheel; excessive play or grinding means full service, not just grease.",
        "If packing: clean, inspect races, pack with marine wheel bearing grease, and reassemble with new cotter pin.",
        "Pump grease into Bearing Buddy until a slight flex of the piston; wipe excess.",
      ],
      parts: [
        part("bearing-grease", "Marine wheel bearing grease", "Water-resistant grease for hubs", "marine trailer wheel bearing grease"),
        part("bearing-buddy", "Bearing Buddy / hub protector", "Keeps water out and grease in", "bearing buddy trailer"),
        part("cotter-pins", "Axle cotter pins", "Secure the castle nut after service", "trailer axle cotter pins"),
      ],
    },
    "Tire pressure & tread": {
      steps: [
        "Check pressure cold (before driving). Inflate to the PSI on the tire sidewall, not the boat’s “looks right.”",
        "Inspect tread for cupping, cracks, weather checking, and embedded debris.",
        "Check the spare the same way — many trips end when the spare is flat too.",
        "Look for bulges or sidewall damage; replace tires older than ~5–7 years regardless of tread.",
        "Torque lug nuts to spec after any wheel removal; recheck after 50 miles.",
      ],
      parts: [
        part("tire-gauge", "Digital tire pressure gauge", "Accurate cold PSI readings", "digital tire pressure gauge"),
        part("portable-inflator", "12V portable inflator", "Top off at the ramp or roadside", "12V portable tire inflator"),
        part("valve-caps", "Metal valve stem caps", "Keep grit and moisture out of stems", "metal tire valve caps"),
      ],
    },
    "Lights & wiring": {
      steps: [
        "Plug into the tow vehicle and test tail, brake, turn, and marker lights with a helper or pedal tester.",
        "Clean the 4/5/7-pin connector contacts; apply dielectric grease sparingly.",
        "Trace dark lamps: bulb → ground → harness chafing near the frame and bunks.",
        "Replace cracked lenses and corroded sockets; seal connections against road spray.",
        "Secure loose wiring with UV-rated zip ties so nothing drags.",
      ],
      parts: [
        part("led-trailer-lights", "LED trailer light kit", "Brighter, longer-lasting markers/tails", "LED boat trailer light kit"),
        part("trailer-connector", "4/7-pin trailer connector", "Reliable plug to the tow vehicle", "trailer wiring connector 7 pin"),
        part("dielectric-grease-lights", "Dielectric grease", "Keeps moisture out of bulb sockets", "dielectric grease"),
      ],
    },
    "Winch & strap": {
      steps: [
        "Inspect the strap or cable for frays, UV cracks, and crushed sections — replace at first doubt.",
        "Check winch gear engagement and ratchet pawls; lubricate moving parts lightly per maker guidance.",
        "Verify the bow eye hook latches fully and the safety chain/cable backup is present.",
        "Test winching on land with the boat secured by bow strap and winch — never rely on the winch alone on the highway.",
        "Rinse salt off after coastal trips; store strap dry.",
      ],
      parts: [
        part("winch-strap", "Trailer winch strap", "Replace worn webbing before it snaps", "boat trailer winch strap"),
        part("winch-hook", "Winch hook / safety latch", "Secure connection to the bow eye", "boat winch hook latch"),
        part("winch-lube", "Winch / gear lubricant", "Keeps gears smooth without gumming", "winch lubricant spray"),
      ],
    },
    "Coupler / safety chains": {
      steps: [
        "Latch the coupler fully on the hitch ball; insert the lock pin or coupler lock.",
        "Confirm hitch ball size matches the coupler (usually 2\" or 2-5/16\").",
        "Cross safety chains under the tongue so they cradle the coupler if it pops off.",
        "Attach the breakaway cable to the tow vehicle (not the chains) if surge/electric brakes are fitted.",
        "Grease the hitch ball lightly; check coupler latch spring tension periodically.",
      ],
      parts: [
        part("coupler-lock", "Trailer coupler lock", "Theft deterrent and latch security", "trailer coupler lock"),
        part("safety-chains", "Safety chains with hooks", "Required backup if coupler fails", "trailer safety chains"),
        part("hitch-ball", "Hitch ball (correct size)", "Match coupler rating and diameter", "trailer hitch ball 2 inch"),
      ],
    },
    "Brakes (if applicable)": {
      steps: [
        "Know your system: surge hydraulic vs electric. Never drive with a disabled breakaway switch.",
        "Jack and support safely; remove a wheel to inspect pads/shoes, drums/rotors, and magnets (electric).",
        "Adjust mechanical shoes so slight drag is felt, then back off per manual; test in a safe area.",
        "For surge: check master cylinder fluid level and look for leaks at the actuator and lines.",
        "Test breakaway: pull the pin with wheels chocked — brakes should apply. Replace the lanyard if frayed.",
      ],
      parts: [
        part("brake-pads", "Trailer brake pads / shoes", "Restore stopping power when worn", "boat trailer brake pads"),
        part("brake-fluid", "DOT brake fluid", "Hydraulic surge systems only — correct DOT type", "DOT 3 brake fluid"),
        part("breakaway-kit", "Breakaway switch & battery", "Applies brakes if trailer separates", "trailer breakaway switch kit"),
      ],
    },
    "Leaf springs / suspension": {
      steps: [
        "Park on level ground; chock wheels. Inspect springs for cracks, shifted leaves, or flattened arch.",
        "Check U-bolts for looseness or rust; retorque to axle-spec if you have a torque wrench.",
        "Inspect bushings and shackles for play or dry squeak; lubricate grease fittings if present.",
        "Look under the bunks/frame for equal tire wear — uneven wear can mean bent axle or sagging spring.",
        "Replace damaged springs in pairs when possible; don’t mix heavily worn with new on the same axle.",
      ],
      parts: [
        part("u-bolts", "Axle U-bolt kit", "Clamps springs securely to the axle", "trailer axle u-bolt kit"),
        part("spring-bushings", "Leaf spring bushings", "Quiet, controlled spring movement", "trailer leaf spring bushings"),
        part("grease-gun", "Grease gun cartridge", "Service suspension zerks", "grease gun cartridge marine"),
      ],
    },
    "Wheel bearings service": {
      steps: [
        "Plan a full service annually or after deep water submersion — don’t wait for a seized hub on the highway.",
        "Support the trailer; remove wheel, dust cap, cotter pin, spindle nut, and hub assembly.",
        "Clean all grease; inspect bearings and races for pitting or blue heat marks — replace as a set if damaged.",
        "Pack bearings thoroughly with marine grease; install new seal; set preload per axle type (castle nut feel).",
        "New cotter pin, dust cap or Bearing Buddy, torque lug nuts, and road-test listening for noise.",
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
      return task;
    }
    if (!Array.isArray(task.steps) || task.steps.length === 0) {
      task.steps = cat.steps.slice();
    }
    if (!Array.isArray(task.parts) || task.parts.length === 0) {
      task.parts = cat.parts.map((p) => ({ ...p, id: p.id + "_" + (task.id || uid()).slice(-6) }));
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
      },
      {
        id: trailerId,
        name: "My Trailer",
        type: "trailer",
        notes: "Boat trailer — hubs, lights, tires, winch, brakes.",
        hourMeter: null,
        odometer: null,
        trailerType: null,
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
      }
      if (a.type === "trailer") {
        if (!("trailerType" in a)) { a.trailerType = null; changed = true; }
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
      const beforeSteps = Array.isArray(t.steps) && t.steps.length > 0;
      const beforeParts = Array.isArray(t.parts) && t.parts.length > 0;
      enrichFromCatalog(t);
      if ((!beforeSteps && t.steps?.length) || (!beforeParts && t.parts?.length)) {
        changed = true;
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
      if (state.setupComplete) navigate("more", { clearHistory: true });
      else navigate("track", { clearHistory: true });
    } else if (currentView === "asset" || currentView === "settings" || currentView === "assets") {
      navigate("more", { clearHistory: true });
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
    const boat = getBoat();
    const trailer = getTrailer();
    if (boat) {
      boat.boatType = boatType;
      boat.engineType = engineType;
      boat.engineHp = size.engineHp;
      boat.engineSizeLabel = size.engineSizeLabel;
      const typeLabel = boatTypeLabel(boatType);
      if (!boat.name || boat.name === "My Boat") {
        boat.name = typeLabel;
      }
    }
    if (trailer) {
      trailer.trailerType = trailerType;
      if (!trailer.name || trailer.name === "My Trailer") {
        trailer.name =
          trailerType === "none" ? "No trailer" : trailerTypeLabel(trailerType);
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
        <div class="pro-icon">✨</div>
        <div class="pro-body">
          <strong>Dockside Pro — coming soon</strong>
          Pro unlocks full guide library + smarter parts picks — coming soon
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
      return `<div class="empty-state"><div class="empty-icon">⚓</div><h3>All clear</h3><p>${emptyMsg}</p></div>`;
    }
    return parts.join("");
  }

  function partsListHTML(parts) {
    if (!parts || !parts.length) {
      return `<p style="font-size:0.85rem;color:var(--text-muted)">No parts listed for this job yet.</p>`;
    }
    return parts
      .map(
        (p) => `
      <div class="part-row">
        <div class="part-info">
          <div class="part-name">${escapeHtml(p.name)}</div>
          <div class="part-why">${escapeHtml(p.why)}</div>
        </div>
        <a class="btn btn-shop" href="${escapeAttr(p.url)}" target="_blank" rel="noopener noreferrer">Shop</a>
      </div>`
      )
      .join("");
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
          <div class="setup-emoji">🚤</div>
          <h2>${editing ? "Your gear" : "Welcome to Dockside"}</h2>
          <p>Tell Dockside what you run — we’ll tailor maintenance.</p>
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
          <div class="form-group setup-field">
            <label for="trailerType">Trailer type</label>
            <select id="trailerType" name="trailerType" required class="setup-select">
              <option value="" disabled ${!trailer.trailerType ? "selected" : ""}>Select trailer type</option>
              ${optionsHTML(TRAILER_TYPES, trailer.trailerType || "")}
            </select>
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

    const summary = gearSummaryLabel();
    const basedOn = state.setupComplete
      ? `<p class="gear-based">Based on your ${escapeHtml(summary)}</p>`
      : "";
    const incompleteBanner = !state.setupComplete
      ? `<div class="setup-banner" data-action="goto-setup">
           <div class="setup-banner-body">
             <strong>Complete your gear profile</strong>
             <span>Tell Dockside what you run — we’ll tailor maintenance.</span>
           </div>
           <span class="chevron">›</span>
         </div>`
      : "";
    const gearChip = state.setupComplete
      ? `<div class="gear-chip-row">
           <button type="button" class="gear-chip" data-action="goto-setup">
             <span class="gear-chip-icon">⚓</span>
             <span class="gear-chip-text">${escapeHtml(summary)}</span>
             <span class="gear-chip-edit">Edit</span>
           </button>
         </div>`
      : "";

    return `
      ${incompleteBanner}
      ${gearChip}
      ${basedOn}
      <div class="stats-strip">
        <div class="stat-pill overdue"><div class="num">${groups.overdue.length}</div><div class="lbl">Overdue</div></div>
        <div class="stat-pill due-soon"><div class="num">${groups.dueSoon.length}</div><div class="lbl">Due soon</div></div>
        <div class="stat-pill ok"><div class="num">${groups.upcoming.length}</div><div class="lbl">Upcoming</div></div>
      </div>
      <div class="asset-chips">${chips}</div>
      <div class="cta-row">
        <button type="button" class="btn btn-primary" data-action="add-task">+ Add task</button>
        <button type="button" class="btn btn-secondary" data-action="goto-more">Assets</button>
      </div>
      ${sectionsHTML(groups, "Nothing due in this filter. Add a task or check another asset.", { showAsset: filterAssetId === "all" })}
    `;
  }

  function renderGuides() {
    let tasks = visibleTasks(state.tasks).filter((t) => Array.isArray(t.steps) && t.steps.length > 0);
    if (guidesFilter === "boat" || guidesFilter === "trailer") {
      tasks = tasks.filter((t) => {
        const a = state.assets.find((x) => x.id === t.assetId);
        return a && a.type === guidesFilter;
      });
    }
    tasks = [...tasks].sort((a, b) => a.title.localeCompare(b.title));

    const chips = `
      <button type="button" class="chip ${guidesFilter === "all" ? "active" : ""}" data-action="filter-guides" data-id="all">All</button>
      <button type="button" class="chip ${guidesFilter === "boat" ? "active" : ""}" data-action="filter-guides" data-id="boat">Boat</button>
      <button type="button" class="chip ${guidesFilter === "trailer" ? "active" : ""}" data-action="filter-guides" data-id="trailer">Trailer</button>
    `;

    const list = tasks.length
      ? tasks
          .map((t) => {
            const asset = state.assets.find((a) => a.id === t.assetId);
            const n = t.steps.length;
            const pc = (t.parts || []).length;
            return `
            <div class="guide-row" data-action="open-guide" data-id="${t.id}">
              <div class="guide-icon">${asset?.type === "trailer" ? "🚛" : "🚤"}</div>
              <div class="guide-info">
                <div class="guide-title">${escapeHtml(t.title)}</div>
                <div class="guide-meta">${escapeHtml(asset?.name || "")} · ${n} steps${pc ? ` · ${pc} parts` : ""}</div>
              </div>
              <span class="chevron">›</span>
            </div>`;
          })
          .join("")
      : `<div class="empty-state"><div class="empty-icon">📖</div><h3>No guides yet</h3><p>Seeded tasks include how-tos. Reset data in Settings if needed.</p></div>`;

    return `
      ${proBannerHTML()}
      <div class="asset-chips">${chips}</div>
      <div class="section-label">How-to guides <span class="count">${tasks.length}</span></div>
      ${list}
    `;
  }

  function renderParts() {
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

    let total = 0;
    const sections = state.assets
      .map((a) => {
        const items = byAsset[a.id] || [];
        total += items.length;
        if (!items.length) return "";
        return `
          <div class="section-label">${escapeHtml(a.name)} <span class="count">${items.length}</span></div>
          ${items
            .map(
              (row) => `
            <div class="part-row">
              <div class="part-info">
                <div class="part-name">${escapeHtml(row.part.name)}</div>
                <div class="part-why">${escapeHtml(row.part.why)}</div>
                <div class="part-task">${escapeHtml(row.task.title)}</div>
              </div>
              <a class="btn btn-shop" href="${escapeAttr(row.part.url)}" target="_blank" rel="noopener noreferrer">Shop</a>
            </div>`
            )
            .join("")}`;
      })
      .join("");

    return `
      ${proBannerHTML()}
      <div class="section-label">Parts catalog <span class="count">${total}</span></div>
      ${
        total
          ? sections
          : `<div class="empty-state"><div class="empty-icon">🔧</div><h3>No parts yet</h3><p>Seeded jobs include shop links. Reset in Settings if your data is empty.</p></div>`
      }
    `;
  }

  function renderMore() {
    const overdue = visibleTasks(state.tasks).filter((t) => statusOf(t) === "overdue" || !t.lastDoneAt).length;
    const summary = state.setupComplete ? gearSummaryLabel() : "Not set up yet";
    return `
      <div class="section-label">Menu</div>
      <div class="more-menu-item" data-action="goto-setup">
        <div class="mm-icon">⚓</div>
        <div class="mm-body">
          <div class="mm-title">Your gear</div>
          <div class="mm-sub">${escapeHtml(summary)}</div>
        </div>
        <span class="chevron">›</span>
      </div>
      <div class="more-menu-item" data-action="goto-assets">
        <div class="mm-icon">🚤</div>
        <div class="mm-body">
          <div class="mm-title">Assets</div>
          <div class="mm-sub">${state.assets.length} assets · ${overdue ? overdue + " overdue tasks" : "on track"}</div>
        </div>
        <span class="chevron">›</span>
      </div>
      <div class="more-menu-item" data-action="goto-settings">
        <div class="mm-icon">⚙️</div>
        <div class="mm-body">
          <div class="mm-title">Settings</div>
          <div class="mm-sub">Rename assets, backup, reset</div>
        </div>
        <span class="chevron">›</span>
      </div>
      <p style="text-align:center;font-size:0.75rem;color:var(--text-dim);margin-top:20px">
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

  function renderTaskDetail() {
    const task = state.tasks.find((t) => t.id === currentTaskId);
    if (!task) {
      return `<div class="empty-state"><h3>Task not found</h3><button class="btn btn-secondary" data-action="go-back">Back</button></div>`;
    }
    const asset = state.assets.find((a) => a.id === task.assetId);
    const st = statusOf(task);
    const due = nextDue(task);
    const steps = Array.isArray(task.steps) ? task.steps : [];
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
        <h3>📖 How-to</h3>
        ${
          steps.length
            ? `<ol class="howto-steps">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
               <div class="safety-note">⚠️ Safety first: follow your engine/trailer manual. Wear eye protection, support the trailer/boat securely, and disconnect power/fuel as needed before DIY work.</div>`
            : `<p style="font-size:0.85rem;color:var(--text-muted)">No how-to steps for this task yet. Seeded jobs include guides — or add notes while you work.</p>`
        }
      </div>

      <div class="parts-block">
        <h3>🔧 Parts for this job</h3>
        ${partsListHTML(parts)}
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
    if (currentView === "more") return "More";
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
    else if (currentView === "more") html = renderMore();
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
        (v === "more" &&
          (currentView === "more" ||
            currentView === "assets" ||
            currentView === "asset" ||
            currentView === "settings"));
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
        if (hpBlock) hpBlock.style.display = et && et !== "none" && et !== "electric" ? "" : "none";
        if (kwBlock) kwBlock.style.display = et === "electric" ? "" : "none";
        if (customBlock) {
          customBlock.style.display =
            et && et !== "none" && et !== "electric" && hpPreset?.value === "custom" ? "" : "none";
        }
      };
      if (engSel) engSel.addEventListener("change", syncEngineSize);
      if (hpPreset) hpPreset.addEventListener("change", syncEngineSize);
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
      case "goto-more":
        navigate("more", { clearHistory: true });
        break;
      case "goto-assets":
        navigate("assets", { pushHistory: currentView === "more" });
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
        else if (v === "more") navigate("more", { clearHistory: true });
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
    else if (hash === "more") currentView = "more";
    else if (hash === "setup") currentView = "setup";

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
