frappe.pages["live-financial-assessment"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Live Financial Assessment",
        single_column: true
    });

    // Scope everything under .fa-page so Frappe desk styles don't interfere
    page.main.addClass("fa-page").html(`
        <header>
            <div>
                <h1>Live Financial Assessment</h1>
                <div class="note">Change any figure or slider and every result updates instantly.</div>
            </div>
            <div class="noprint">
                <button class="ghost" id="reset">Reset</button>
                <button id="print">Save as PDF</button>
            </div>
        </header>

        <main>
            <aside class="card noprint">
                <h2>Client details</h2>
                <div class="fld">
                    <label for="type">Client type</label>
                    <select id="type">
                        <option value="salaried">Salaried</option>
                        <option value="business" selected>Business owner</option>
                        <option value="both">Both</option>
                    </select>
                </div>
                <div class="fld">
                    <label for="cur">Currency</label>
                    <select id="cur">
                        <option>INR</option>
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                        <option>AED</option>
                    </select>
                </div>
                <div id="flds"></div>
                <h2 style="margin-top:14px">What if...</h2>
                <div id="sls"></div>
            </aside>

            <section>
                <div class="card hero">
                    <div class="ring">
                        <svg viewBox="0 0 150 150">
                            <circle cx="75" cy="75" r="62" fill="none" stroke="var(--line)" stroke-width="12"></circle>
                            <circle id="arc" cx="75" cy="75" r="62" fill="none" stroke="var(--acc)" stroke-width="12" stroke-linecap="round" stroke-dasharray="0 390" transform="rotate(-90 75 75)" style="transition:stroke-dasharray .4s"></circle>
                        </svg>
                        <b id="sc">0</b>
                        <small id="rt"></small>
                    </div>
                    <div class="kp" id="kp"></div>
                </div>

                <div class="card">
                    <h2>What is helping and what is holding you back</h2>
                    <div id="bars"></div>
                </div>

                <div class="card">
                    <h2>Smart insights</h2>
                    <ul class="ins" id="ins"></ul>
                </div>

                <div class="card">
                    <h2>Retirement outlook</h2>
                    <svg id="ch" viewBox="0 0 620 210" role="img" aria-label="Projected retirement corpus versus required"></svg>
                    <table id="sct"></table>
                    <p class="note" id="nt"></p>
                </div>
            </section>
        </main>
    `);

    // =========================================================
    // DEFAULT VALUES
    // =========================================================
    const D = {
        type: "business",
        cur: "INR",
        age: 42,
        retAge: 60,
        inc: 535000,
        exp: 325000,
        emi: 135000,
        liquid: 1800000,
        inv: 9000000,
        ret: 3200000,
        prop: 27000000,
        biz: 45000000,
        other: 1500000,
        debt: 11300000,
        life: 20000000,
        health: 1000000,
        dep: 3,
        mInv: 75000,
        r: 9,
        inf: 6,
        cut: 0
    };

    // =========================================================
    // FIELD CONFIGURATION
    // =========================================================
    const F = [
        ["age", "Age"],
        ["retAge", "Retire at age"],
        ["inc", "Monthly income"],
        ["exp", "Monthly living expenses"],
        ["emi", "Monthly loan EMIs"],
        ["liquid", "Cash and deposits"],
        ["inv", "Market investments"],
        ["ret", "Retirement accounts"],
        ["prop", "Property"],
        ["biz", "Business equity"],
        ["other", "Other assets"],
        ["debt", "Loans outstanding"],
        ["life", "Life cover"],
        ["health", "Health cover"],
        ["dep", "Dependents"]
    ];

    // =========================================================
    // SLIDER CONFIGURATION
    // =========================================================
    const S = [
        ["mInv", "Monthly investing", 0, 500000, 5000, v => fm(v)],
        ["r", "Expected return", 3, 15, .5, v => v + "%"],
        ["inf", "Inflation", 2, 10, .5, v => v + "%"],
        ["cut", "Cut living expenses", 0, 40, 1, v => v + "%"]
    ];

    // =========================================================
    // STATE
    // =========================================================
    let V = { ...D };
    let base = null;

    try {
        Object.assign(V, JSON.parse(localStorage.getItem("fa") || "{}"));
    } catch (e) {
        console.warn("Unable to restore saved assessment:", e);
    }

    // =========================================================
    // UTILITY FUNCTIONS
    // =========================================================
    const $ = selector => page.main.find(selector);

    const fm = x => {
        const l = V.cur == "INR" ? "en-IN" : "en-US";
        return V.cur + " " + Math.round(x).toLocaleString(l);
    };

    const cp = x => {
        const a = Math.abs(x);
        if (V.cur == "INR") {
            if (a >= 1e7) return (x / 1e7).toFixed(1) + "Cr";
            if (a >= 1e5) return (x / 1e5).toFixed(1) + "L";
        } else {
            if (a >= 1e6) return (x / 1e6).toFixed(1) + "M";
        }
        return Math.round(x / 1e3) + "K";
    };

    const pc = (x, d = 0) => (x * 100).toFixed(d) + "%";

    const col = s => "var(--" + (s >= 75 ? "acc" : s >= 50 ? "warn" : "bad") + ")";

    // =========================================================
    // BUILD INPUTS
    // =========================================================
    function build() {
        $("#type").val(V.type);
        $("#cur").val(V.cur);

        $("#flds").html(
            F.map(function ([k, l]) {
                return `<div class="fld"><label for="${k}">${l}</label><input id="${k}" type="number" min="0" value="${V[k]}"></div>`;
            }).join("")
        );

        $("#sls").html(
            S.map(function ([k, l, a, b, st]) {
                return `<div class="sl"><label for="${k}"><span>${l}</span><b id="v_${k}"></b></label><input id="${k}" type="range" min="${a}" max="${b}" step="${st}" value="${V[k]}"></div>`;
            }).join("")
        );
    }

    // =========================================================
    // CALCULATIONS
    // =========================================================
    function calc() {
        const v = V;
        const exp = v.exp * (1 - v.cut / 100);
        const out = exp + v.emi;
        const sur = v.inc - out;
        const sr = v.inc ? sur / v.inc : 0;

        const A = v.liquid + v.inv + v.ret + v.prop + v.biz + v.other;
        const nw = A - v.debt;
        const tg = v.type == "business" ? 12 : v.type == "both" ? 9 : 6;
        const em = out ? v.liquid / out : 0;
        const dti = v.inc ? v.emi / v.inc : 0;

        const need = Math.max(0, 10 * v.inc * 12 + v.debt - v.liquid - v.inv);
        const lr = need ? v.life / need : 1;
        const hmin = v.cur == "INR" ? 1e6 : 1e5;
        const hr = v.health / hmin;
        const ins = (Math.min(lr, 1) + Math.min(hr, 1)) / 2;

        const n = Math.max(0, v.retAge - v.age);

        const proj = (r, inf, m) => {
            let c = v.inv + v.ret;
            const a = [c];
            for (let i = 0; i < n; i++) {
                c = c * (1 + r / 100) + m * 12;
                a.push(c);
            }
            return { a, need: exp * Math.pow(1 + inf / 100, n) * 12 / .04 };
        };

        const P = proj(v.r, v.inf, v.mInv);
        const pj = P.a[n] || 0;
        const rd = P.need ? pj / P.need : 1;
        const gap = Math.max(0, P.need - pj);
        const f = v.r ? (Math.pow(1 + v.r / 100, n) - 1) / (v.r / 100) : n;
        const extra = n && gap ? gap / f / 12 : 0;

        const grp = [v.liquid, v.inv, v.ret, v.prop, v.biz, v.other];
        const conc = A ? Math.max(...grp) / A : 0;

        const ds = x => x <= .18 ? 100 : x <= .36 ? 100 - 40 * (x - .18) / .18 : x <= .54 ? 60 - 60 * (x - .36) / .18 : 0;

        const C = {
            "Savings rate": Math.min(100, Math.max(0, sr / .2 * 100)),
            "Emergency fund": Math.min(100, em / tg * 100),
            "Debt burden": ds(dti),
            "Insurance cover": ins * 100,
            "Retirement readiness": Math.min(100, rd * 100),
            "Diversification": conc <= .6 ? 100 : Math.max(0, 100 * (1 - (conc - .6) / .4))
        };

        const W = [.2, .2, .15, .15, .2, .1];
        const sc = Math.round(Object.values(C).reduce((s, x, i) => s + x * W[i], 0));

        const sc3 = [
            ["Pessimistic", v.r - 3, v.inf + 1],
            ["Base", v.r, v.inf],
            ["Optimistic", v.r + 2, v.inf]
        ].map(([t, r, i]) => {
            const q = proj(Math.max(0, r), i, v.mInv);
            return [t, q.a[n] || 0, q.need, q.need ? (q.a[n] || 0) / q.need : 1];
        });

        const I = [];
        const add = (p, a, t) => I.push([p, a, t]);

        if (sur < 0) add("High", "Cash flow", `You spend ${fm(-sur)} more than you earn each month. Cut spending or raise income first.`);
        else if (sr < .2) add(sr < .1 ? "High" : "Medium", "Savings", `Savings rate is ${pc(sr, 1)}. About ${fm(.2 * v.inc - sur)} more a month reaches the 20% goal.`);

        if (em < tg) add(em < tg / 2 ? "High" : "Medium", "Emergency fund", `Cash covers ${em.toFixed(1)} months; aim for ${tg}. Add about ${fm(tg * out - v.liquid)} to liquid savings.`);

        if (dti > .36) add("High", "Debt", `EMIs take ${pc(dti)} of income. Prepay the costliest loan first.`);

        if (lr < 1) add(lr < .6 ? "High" : "Medium", "Life cover", `Estimated need is ${fm(need)}; you hold ${fm(v.life)}. A term plan can close ${fm(need - v.life)}.`);

        if (hr < 1) add(hr < .6 ? "High" : "Medium", "Health cover", `Health cover is below ${fm(hmin)}. A super top-up policy is a cheap fix.`);

        if (rd < 1) add(rd < .6 ? "High" : "Medium", "Retirement", `On track for ${pc(rd)} of the ${fm(P.need)} needed. Investing ${fm(extra)} more a month closes the gap.`);

        if (conc > .6) add("Medium", "Diversification", `${pc(conc)} of assets sit in one class. Direct new savings elsewhere.`);

        if (v.type != "salaried" && v.biz / Math.max(nw, 1) > .5) add("Medium", "Business concentration", `Business equity is ${pc(v.biz / nw)} of net worth. Build wealth outside the business.`);

        if (!I.length) add("Low", "All clear", "Every checkpoint is healthy. Review again after any big life or business change.");

        I.sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a[0]] - { High: 0, Medium: 1, Low: 2 }[b[0]]));

        return { sur, sr, nw, em, tg, dti, rd, sc, C, P, n, I, sc3, exp };
    }

    // =========================================================
    // DRAW
    // =========================================================
    function draw() {
        const R = calc();

        if (!base) base = R.sc;

        const rt = R.sc >= 80 ? "Excellent" : R.sc >= 65 ? "Good" : R.sc >= 50 ? "Fair" : "Needs attention";
        const d = R.sc - base;

        $("#sc").text(R.sc);
        $("#rt").text(rt + (d ? ` (${d > 0 ? "+" : ""}${d})` : ""));
        $("#arc").attr("stroke-dasharray", `${R.sc / 100 * 390} 390`);
        $("#arc").css("stroke", col(R.sc));

        const K = [
            ["Net worth", fm(R.nw), ""],
            ["Monthly surplus", fm(R.sur), R.sr >= .2 ? "g" : R.sr >= .14 ? "w" : "b"],
            ["Savings rate", pc(R.sr, 1), R.sr >= .2 ? "g" : R.sr >= .14 ? "w" : "b"],
            ["Emergency fund", R.em.toFixed(1) + " mo", R.em >= R.tg ? "g" : R.em >= .7 * R.tg ? "w" : "b"],
            ["Debt-to-income", pc(R.dti, 1), R.dti <= .36 ? "g" : "b"],
            ["Retirement ready", pc(R.rd), R.rd >= 1 ? "g" : R.rd >= .7 ? "w" : "b"]
        ];

        $("#kp").html(K.map(([a, b, c]) => `<div><span>${a}</span><strong class="${c}">${b}</strong></div>`).join(""));

        $("#bars").html(
            Object.entries(R.C).map(([k, x]) => `<div class="bar"><span>${k}</span><i><s style="width:${x}%;background:${col(x)}"></s></i><b>${Math.round(x)}</b></div>`).join("")
        );

        $("#ins").html(R.I.map(([p, a, t]) => `<li class="${p}"><em>${a}.</em> ${t}</li>`).join(""));

        S.forEach(([k, , , , , f]) => $("#v_" + k).text(f(V[k])));

        const a = R.P.a;
        const mx = Math.max(R.P.need, ...a) * 1.08 || 1;
        const X = i => 40 + i * (560 / Math.max(1, a.length - 1));
        const Y = y => 180 - y / mx * 165;

        $("#ch").html(`
            <g stroke="var(--line)">
                <line x1="40" y1="180" x2="600" y2="180"/>
                <line x1="40" y1="15" x2="40" y2="180"/>
            </g>
            <line x1="40" x2="600" y1="${Y(R.P.need)}" y2="${Y(R.P.need)}" stroke="var(--bad)" stroke-dasharray="6 4"/>
            <polyline fill="none" stroke="var(--acc)" stroke-width="3" points="${a.map((y, i) => X(i) + "," + Y(y)).join(" ")}"/>
            <g fill="var(--mut)" font-size="11">
                <text x="44" y="${Y(R.P.need) - 5}">Needed ${cp(R.P.need)}</text>
                <text x="560" y="${Y(a[a.length - 1]) - 7}" text-anchor="end">Projected ${cp(a[a.length - 1])}</text>
                <text x="40" y="198">Age ${V.age}</text>
                <text x="600" y="198" text-anchor="end">Age ${V.retAge}</text>
            </g>
        `);

        $("#sct").html(
            "<tr><th>Scenario</th><th>Projected</th><th>Needed</th><th>Ready</th></tr>" +
            R.sc3.map(([t, p, n, r]) => `<tr><td>${t}</td><td>${fm(p)}</td><td>${fm(n)}</td><td class="${r >= 1 ? "g" : r >= .7 ? "w" : "b"}">${pc(r)}</td></tr>`).join("")
        );

        $("#nt").text(`Needed corpus assumes a 4% withdrawal rate on today's living costs grown at ${V.inf}% inflation. Property and business equity are excluded from the retirement corpus.`);
    }

    // =========================================================
    // INPUT HANDLER
    // =========================================================
    function on(e) {
        const t = e.target;
        const k = t.id;

        if (!(k in V)) return;

        V[k] = ["type", "cur"].includes(k) ? t.value : +t.value || 0;

        try {
            localStorage.setItem("fa", JSON.stringify(V));
        } catch (x) {}

        draw();
    }

    // =========================================================
    // INITIALIZATION
    // =========================================================
    build();
    draw();

    page.main.on("input", on);

    // =========================================================
    // PRINT / SAVE AS PDF
    // =========================================================
    $("#print").on("click", function () {
        window.print();
    });

    // =========================================================
    // RESET
    // =========================================================
    $("#reset").on("click", function () {
        V = { ...D };
        try {
            localStorage.removeItem("fa");
        } catch (e) {}
        base = null;
        build();
        draw();
    });
};