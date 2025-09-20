let price = 19.5;
let cid = [
  ["PENNY", 1.01],
  ["NICKEL", 2.05],
  ["DIME", 3.1],
  ["QUARTER", 4.25],
  ["ONE", 90],
  ["FIVE", 55],
  ["TEN", 20],
  ["TWENTY", 60],
  ["ONE HUNDRED", 100]
];


// ---- helpers ----
const $ = (sel) => document.querySelector(sel);
const changeDueEl = $("#change-due");
const cashInput = $("#cash");
const drawerList = $("#drawer-list");

const DENOMS = [
  ["ONE HUNDRED", 10000],
  ["TWENTY", 2000],
  ["TEN", 1000],
  ["FIVE", 500],
  ["ONE", 100],
  ["QUARTER", 25],
  ["DIME", 10],
  ["NICKEL", 5],
  ["PENNY", 1]
];

// format like $60, $0.5, $0.04 (trim trailing zeros)
function fmt(amount) {
  const s = Number(amount).toFixed(2).replace(/\.?0+$/, "");
  return `$${s}`;
}

// convert dollars to integer cents safely
const toCents = (n) => Math.round(Number(n) * 100);

// optional UI: show current drawer
function renderDrawer() {
  if (!drawerList) return;
  drawerList.innerHTML = "";
  // show highest -> lowest
  const byName = Object.fromEntries(cid);
  DENOMS.forEach(([name]) => {
    const val = byName[name] ?? 0;
    const li = document.createElement("li");
    li.textContent = `${name}: ${fmt(val)}`;
    drawerList.appendChild(li);
  });
}

function computeChange(changeDueCents, cidArr) {
  // build cents map for quick access
  const cidMapCents = new Map(
    cidArr.map(([name, amt]) => [name, toCents(amt)])
  );
  const totalCidCents = Array.from(cidMapCents.values()).reduce((a, b) => a + b, 0);

  if (totalCidCents < changeDueCents) {
    return { status: "INSUFFICIENT_FUNDS" };
  }

  if (totalCidCents === changeDueCents) {
    // CLOSED: return entire cid contents, highest -> lowest, only non-zero
    const closedParts = [];
    for (const [name, valCents] of DENOMS) {
      const have = cidMapCents.get(name) || 0;
      if (have > 0) closedParts.push(`${name}: ${fmt(have / 100)}`);
    }
    return { status: "CLOSED", parts: closedParts };
  }

  // OPEN: greedy from highest to lowest
  let remaining = changeDueCents;
  const parts = [];
  for (const [name, valueCents] of DENOMS) {
    let take = 0;
    let have = cidMapCents.get(name) || 0;
    if (remaining >= valueCents && have > 0) {
      const maxUnits = Math.min(Math.floor(remaining / valueCents), Math.floor(have / valueCents));
      take = maxUnits * valueCents;
      remaining -= take;
      cidMapCents.set(name, have - take);
    }
    if (take > 0) {
      parts.push(`${name}: ${fmt(take / 100)}`);
    }
  }

  if (remaining > 0) {
    return { status: "INSUFFICIENT_FUNDS" };
  }

  return { status: "OPEN", parts };
}

function handlePurchase() {
  const cash = Number(cashInput.value);

  if (Number.isNaN(cash)) return; // silently ignore bad input (tests set valid values)

  if (cash < price) {
    window.alert("Customer does not have enough money to purchase the item");
    return;
  }

  if (cash === price) {
    changeDueEl.textContent = "No change due - customer paid with exact cash";
    return;
  }

  const changeDueCents = toCents(cash - price);
  const result = computeChange(changeDueCents, cid);

  if (result.status === "INSUFFICIENT_FUNDS") {
    changeDueEl.textContent = "Status: INSUFFICIENT_FUNDS";
    return;
  }

  if (result.status === "CLOSED") {
    // Update cid to reflect closed sale (drawer becomes empty)
    const totalCid = cid.reduce((sum, [, amt]) => sum + toCents(amt), 0);
    if (totalCid === changeDueCents) {
      cid = cid.map(([name, amt]) => [name, 0]); // all paid out
    }
    changeDueEl.textContent = `Status: CLOSED${result.parts.length ? " " + result.parts.join(" ") : ""}`;
    renderDrawer();
    return;
  }

  if (result.status === "OPEN") {
    // Subtract paid change from cid (optional UI correctness; not required by tests)
    const changeMap = new Map(
      result.parts.map(s => {
        // s looks like "TEN: $20"
        const [name, amtStr] = s.split(": ");
        return [name, Number(amtStr.replace("$", ""))];
      })
    );
    cid = cid.map(([name, amt]) => {
      const spent = toCents(changeMap.get(name) || 0);
      return [name, (toCents(amt) - spent) / 100];
    });

    changeDueEl.textContent = `Status: OPEN ${result.parts.join(" ")}`;
    renderDrawer();
  }
}

document.getElementById("purchase-btn").addEventListener("click", handlePurchase);

// initial render for the little drawer viewer
renderDrawer();

