import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { motion } from "framer-motion";
import { LockKeyhole } from "lucide-react";

// =====================
// BasketBridge: Grocery→Margin Mix Board
// Black base theme, board-ready KPIs, passcode gate, interactive charts
// =====================

// ---- PASSCODE (change before publishing) ----
const PASSCODE = "TWG-Board-2025";

// ---- DATA (from uploaded CSV, cleaned in analysis) ----
const kpi = {
  totalGroceryTxns: 24745410,
  totalGrocerySales: 508220881.0,
  pureTxns: 11607631,
  pureSales: 233485016.0,
  mixedTxns: 13137779,
  mixedSales: 274735865.0,
  pctMixed: 0.5309178146573446,
  pctPure: 0.46908218534265544,
  avgAll: 20.53798587293563,
  avgPure: 20.11478621262168,
  avgMixed: 20.91189576259427,
};

// Transaction hierarchy data from the spreadsheet
const transactionHierarchy = {
  total: {
    txnCount: 42300301,
    sales: 1796953852,
    units: 196328020
  },
  grocery: {
    txnCount: 24745410,
    sales: 508220881,
    units: 97386655,
    pure: {
      txnCount: 11607631,
      sales: 233485016,
      units: 44660976
    },
    mixed: {
      txnCount: 13137779,
      sales: 274735865,
      units: 52725679,
      otherCategories: {
        sales: 529328107,
        units: 48211097
      }
    }
  },
  groceryFood: {
    txnCount: 19178280,
    sales: 279842307,
    units: 67548565,
    pure: {
      txnCount: 6687892,
      sales: 87856720,
      units: 21018278
    },
    mixed: {
      txnCount: 12490388,
      sales: 191985587,
      units: 46530287,
      otherCategories: {
        sales: 529081628,
        units: 54524667
      }
    }
  }
};

// Mixed category incidence (non-exclusive; one txn can include multiple categories)
const mixCats = [
  { name: "Home & Garden", mixTxns: 6322479, mixSales: 189188916.0, avgTicket: 29.923217775812304 },
  { name: "Apparel, Footwear & Acc", mixTxns: 5651598, mixSales: 181052443.0, avgTicket: 32.03561948319749 },
  { name: "Leisure, Tech & Play", mixTxns: 4580373, mixSales: 134103224.0, avgTicket: 29.27779549831422 },
  { name: "Work, Study & Create", mixTxns: 881694, mixSales: 12393643.0, avgTicket: 14.05662622179577 },
  { name: "Grocery & Celebrations (outside)", mixTxns: 1120853, mixSales: 12601983.0, avgTicket: 11.243207628475812 },
];

const palette = [
  "#a3a3a3","#22d3ee","#818cf8","#34d399","#f472b6","#fbbf24","#60a5fa","#f97316"
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="bg-neutral-900/60 border-neutral-800 shadow-lg rounded-2xl">
      <CardContent className="p-5">
        <div className="text-neutral-400 text-sm">{label}</div>
        <div className="text-3xl md:text-4xl font-semibold text-white tracking-tight mt-1">{value}</div>
        {sub && <div className="text-neutral-500 text-xs mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function BasketBridge() {
  const [code, setCode] = useState("");
  const [ok, setOk] = useState(false);
  const [mode, setMode] = useState<'CEO' | 'Analyst' | 'Q&A' | 'Drill-Down'>('CEO');
  const [ask, setAsk] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Data could be loaded from /public/data/grocery_summary.json; for now we embed constants.
  const data = { kpi, mixCats };

  const pieData = useMemo(() => ([
    { name: "Mixed Grocery", value: kpi.mixedTxns },
    { name: "Pure Grocery", value: kpi.pureTxns },
  ]), []);

  const barData = useMemo(() => mixCats.map(c => ({
    category: c.name,
    incidence: +(c.mixTxns / kpi.mixedTxns * 100).toFixed(1),
    avgTicket: +c.avgTicket.toFixed(2),
    mixSales: Math.round(c.mixSales),
  })), []);

  // Simple scenario: how much incremental sales if X% of pure grocery converts to mixed at current mixed avg ticket uplift?
  const [conv, setConv] = useState(5); // % of pure txns converting to mixed
  const incrementalSales = useMemo(() => {
    const deltaAvg = kpi.avgMixed - kpi.avgPure; // lift per converted txn
    const txnsConverted = Math.round(kpi.pureTxns * (conv/100));
    return { txnsConverted, sales: deltaAvg * txnsConverted };
  }, [conv]);

  // Drill-Down mode data with percentages
  const hierarchicalData = useMemo(() => {
    const total = transactionHierarchy.total;
    return [
      { name: "Total TWL", txnCount: total.txnCount, sales: total.sales, level: 0, pctTxns: 100, pctRevenue: 100 },
      { name: "Grocery Food & Non-Food", txnCount: transactionHierarchy.grocery.txnCount, sales: transactionHierarchy.grocery.sales, level: 1, pctTxns: (transactionHierarchy.grocery.txnCount / total.txnCount * 100), pctRevenue: (transactionHierarchy.grocery.sales / total.sales * 100) },
      { name: "Grocery Food", txnCount: transactionHierarchy.groceryFood.txnCount, sales: transactionHierarchy.groceryFood.sales, level: 2, pctTxns: (transactionHierarchy.groceryFood.txnCount / total.txnCount * 100), pctRevenue: (transactionHierarchy.groceryFood.sales / total.sales * 100) },
      { name: "Grocery Food (Pure)", txnCount: transactionHierarchy.groceryFood.pure.txnCount, sales: transactionHierarchy.groceryFood.pure.sales, level: 3, pctTxns: (transactionHierarchy.groceryFood.pure.txnCount / total.txnCount * 100), pctRevenue: (transactionHierarchy.groceryFood.pure.sales / total.sales * 100) },
      { name: "Grocery Food (Mixed)", txnCount: transactionHierarchy.groceryFood.mixed.txnCount, sales: transactionHierarchy.groceryFood.mixed.sales, level: 3, pctTxns: (transactionHierarchy.groceryFood.mixed.txnCount / total.txnCount * 100), pctRevenue: (transactionHierarchy.groceryFood.mixed.sales / total.sales * 100) },
      { name: "Grocery (Pure)", txnCount: transactionHierarchy.grocery.pure.txnCount, sales: transactionHierarchy.grocery.pure.sales, level: 2, pctTxns: (transactionHierarchy.grocery.pure.txnCount / total.txnCount * 100), pctRevenue: (transactionHierarchy.grocery.pure.sales / total.sales * 100) },
      { name: "Grocery (Mixed)", txnCount: transactionHierarchy.grocery.mixed.txnCount, sales: transactionHierarchy.grocery.mixed.sales, level: 2, pctTxns: (transactionHierarchy.grocery.mixed.txnCount / total.txnCount * 100), pctRevenue: (transactionHierarchy.grocery.mixed.sales / total.sales * 100) },
    ];
  }, []);

  const barDataHierarchy = useMemo(() => hierarchicalData.map(d => ({
    name: d.name,
    txnCount: d.txnCount,
    sales: d.sales / 1000000, // Convert to millions for readability
    avgTicket: d.sales / d.txnCount
  })), []);

  const kpiCards = [
    { label: "Grocery TXNs (All)", value: kpi.totalGroceryTxns.toLocaleString(), sub: `Avg Ticket $${kpi.avgAll.toFixed(2)}` },
    { label: "Grocery Sales (All)", value: `$${kpi.totalGrocerySales.toLocaleString()}` },
    { label: "Mixed Grocery TXNs", value: kpi.mixedTxns.toLocaleString(), sub: `${(kpi.pctMixed*100).toFixed(1)}% of Grocery` },
    { label: "Mixed Grocery Sales", value: `$${kpi.mixedSales.toLocaleString()}`, sub: `Avg Ticket $${kpi.avgMixed.toFixed(2)}` },
    { label: "Pure Grocery TXNs", value: kpi.pureTxns.toLocaleString(), sub: `${(kpi.pctPure*100).toFixed(1)}% of Grocery` },
    { label: "Pure Grocery Sales", value: `$${kpi.pureSales.toLocaleString()}`, sub: `Avg Ticket $${kpi.avgPure.toFixed(2)}` },
  ];

  const ceoBullets = [
    "53.1% of grocery transactions are MIXED (higher ticket than pure).",
    "HOME & APPAREL dominate mix attachments — drive margin via these.",
    `If we convert ${conv}% of pure grocery to mixed at current uplift, we add ~$${Math.round(incrementalSales.sales).toLocaleString()} on ~${incrementalSales.txnsConverted.toLocaleString()} txns.`,
  ];

  const analystBullets = [
    "Incidence is non-exclusive; attachments can overlap (no dedupe in this extract).",
    "Attachment incidence: Home ~48%, Apparel ~43%, Leisure ~35% of mixed txns.",
    "Use seasonal programs + adjacency + personalised offers to lift conversion.",
  ];

  async function onAsk() {
    setBusy(true); setAnswer(null);
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: ask, data }) });
      const j = await res.json();
      setAnswer(j.answer || 'No answer');
    } catch (e:any) {
      setAnswer('Error contacting Azure OpenAI proxy.');
    } finally { setBusy(false); }
  }

  if (!ok) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <LockKeyhole className="text-neutral-400" />
            <h1 className="text-xl font-semibold">BasketBridge – Board Access</h1>
          </div>
          <p className="text-neutral-400 text-sm mb-4">Enter the passcode to view the dashboard.</p>
          <div className="flex gap-2">
            <Input type="password" placeholder="Passcode" value={code} onChange={(e) => setCode(e.target.value)} className="bg-neutral-900 border-neutral-800 text-white" />
            <Button onClick={() => setOk(code === PASSCODE)} className="bg-white text-black hover:bg-neutral-200">Unlock</Button>
          </div>
          <p className="text-neutral-500 text-xs mt-3">Hint: update PASSCODE in the code before publishing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 md:px-10 py-6 border-b border-neutral-900 bg-gradient-to-b from-neutral-950 to-black flex items-center justify-between">
        <motion.h1 initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.6}} className="text-2xl md:text-3xl font-semibold tracking-tight">BasketBridge <span className="text-neutral-400">• Grocery → Margin Mix</span></motion.h1>
        <div className="flex gap-2">
          <Button onClick={() => setMode('CEO')} className={`bg-neutral-800 hover:bg-neutral-700 text-white ${mode==='CEO'?'ring-2 ring-white/40':''}`}>CEO Mode</Button>
          <Button onClick={() => setMode('Analyst')} className={`bg-neutral-800 hover:bg-neutral-700 text-white ${mode==='Analyst'?'ring-2 ring-white/40':''}`}>Analyst</Button>
          <Button onClick={() => setMode('Drill-Down')} className={`bg-neutral-800 hover:bg-neutral-700 text-white ${mode==='Drill-Down'?'ring-2 ring-white/40':''}`}>Drill-Down</Button>
          <Button onClick={() => setMode('Q&A')} className={`bg-neutral-800 hover:bg-neutral-700 text-white ${mode==='Q&A'?'ring-2 ring-white/40':''}`}>Ask (Azure OpenAI)</Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="px-6 md:px-10 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((c, i) => (
          <motion.div key={i} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay: i*0.05}}>
            <StatCard label={c.label} value={c.value} sub={c.sub} />
          </motion.div>
        ))}
      </div>

      {/* CEO strip */}
      {mode==='CEO' && (
        <div className="px-6 md:px-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl col-span-1">
            <CardContent className="p-6">
              <div className="text-sm text-neutral-300 mb-4">Grocery Mix vs Pure (by transactions)</div>
              <div className="w-full h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                      {pieData.map((_, idx) => <Cell key={idx} fill={palette[idx % palette.length]} />)}
                    </Pie>
                    <ReTooltip formatter={(v: any, n: any) => [Number(v).toLocaleString(), n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-neutral-400 mt-2">{(kpi.pctMixed*100).toFixed(1)}% of grocery transactions are mixed. Mixed baskets carry a higher average ticket (${kpi.avgMixed.toFixed(2)}) than pure grocery (${kpi.avgPure.toFixed(2)}).</div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl lg:col-span-2">
            <CardContent className="p-6">
              <div className="text-sm text-neutral-300 mb-2">Attachment incidence (non‑exclusive) & avg ticket</div>
              <div className="w-full h-72">
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="category" tick={{ fill: "#a3a3a3", fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#a3a3a3", fontSize: 12 }} unit="%" />
                    <ReTooltip formatter={(v: any, n: any) => [n === "incidence" ? v+"%" : `$${Number(v).toLocaleString()}`, n]} />
                    <Legend />
                    <Bar dataKey="incidence" name="Incidence of mixed TXNs" fill={palette[2]} />
                    <Bar dataKey="avgTicket" name="Avg. ticket in that category" fill={palette[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl col-span-1">
            <CardContent className="p-6 space-y-3">
              <div className="text-lg font-medium">CEO TL;DR</div>
              <ul className="list-disc pl-5 space-y-2 text-neutral-300 text-sm">
                {ceoBullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-medium">Conversion Uplift Scenario</div>
                <div className="text-sm text-neutral-400">Convert <b>{conv}%</b> of pure grocery to mixed</div>
              </div>
              <input type="range" min={0} max={20} value={conv} onChange={(e)=> setConv(parseInt(e.target.value))} className="w-full" />
              <div className="text-sm text-neutral-300 mt-2">Incremental sales: <b>${Math.round(incrementalSales.sales).toLocaleString()}</b> on <b>{incrementalSales.txnsConverted.toLocaleString()}</b> converted txns (assumes current avg‑ticket uplift).</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analyst strip */}
      {mode==='Analyst' && (
        <div className="px-6 md:px-10 py-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl">
            <CardContent className="p-6">
              <div className="text-lg font-medium text-white mb-2">Notes & Caveats</div>
              <ul className="list-disc pl-5 space-y-2 text-neutral-300 text-sm">
                {analystBullets.map((b, j) => <li key={j}>{b}</li>)}
                <li className="text-neutral-400">Home ∪ Apparel union not deduped; true overlap requires basket‑line data.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl">
            <CardContent className="p-6">
              <div className="text-lg font-medium text-white mb-2">Export</div>
              <div className="text-neutral-300 text-sm">Use browser print to save PDF. CSV/JSON can be added via a Download button component pulling from /public/data/grocery_summary.json.</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drill-Down strip */}
      {mode==='Drill-Down' && (
        <div className="px-6 md:px-10 py-6">
          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl mb-6">
            <CardContent className="p-6">
              <div className="text-lg font-medium mb-4">Transaction Hierarchy Overview</div>
              <div className="text-sm text-neutral-400 mb-4">
                Drill down from total transactions through Grocery categories to Pure vs Mixed breakdowns
              </div>
              <div className="w-full h-96 min-h-[384px]">
                <ResponsiveContainer width="100%" height={384}>
                  <BarChart data={barDataHierarchy} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 12 }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={200}
                      tick={{ fill: "#a3a3a3", fontSize: 11 }}
                    />
                    <ReTooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'txnCount') return [value.toLocaleString() + ' transactions', name];
                        if (name === 'sales') return ['$' + value.toFixed(2) + 'M', name];
                        if (name === 'avgTicket') return ['$' + value.toFixed(2), name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="txnCount" name="Transaction Count" fill={palette[0]} />
                    <Bar dataKey="sales" name="Sales (Millions $)" fill={palette[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Hierarchical Tree View */}
          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl mb-6">
            <CardContent className="p-6">
              <div className="text-lg font-medium mb-4">Hierarchical Breakdown</div>
              <div className="space-y-4">
                {hierarchicalData.map((item, idx) => (
                  <div key={idx} className="pl-4" style={{ paddingLeft: `${item.level * 2}rem` }}>
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div className={`w-3 h-3 rounded-full ${item.level === 0 ? 'bg-red-500' : item.level === 1 ? 'bg-orange-500' : item.level === 2 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                      <span className="font-medium text-white w-48">{item.name}</span>
                      <span className="text-neutral-400">{item.txnCount.toLocaleString()} txns</span>
                      <span className="text-neutral-300">({item.pctTxns.toFixed(1)}%)</span>
                      <span className="text-neutral-400">${(item.sales / 1000000).toFixed(2)}M</span>
                      <span className="text-neutral-300">({item.pctRevenue.toFixed(1)}%)</span>
                      <span className="text-neutral-500 text-xs">Avg: ${(item.sales / item.txnCount).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl">
              <CardContent className="p-6">
                <div className="text-sm text-neutral-400">Total Transactions (TWL)</div>
                <div className="text-3xl font-semibold text-white mt-2">
                  {transactionHierarchy.total.txnCount.toLocaleString()}
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  ${transactionHierarchy.total.sales.toLocaleString()} total sales
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl">
              <CardContent className="p-6">
                <div className="text-sm text-neutral-400">Grocery Food & Non-Food</div>
                <div className="text-3xl font-semibold text-white mt-2">
                  {transactionHierarchy.grocery.txnCount.toLocaleString()}
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  {((transactionHierarchy.grocery.txnCount / transactionHierarchy.total.txnCount) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl">
              <CardContent className="p-6">
                <div className="text-sm text-neutral-400">Grocery Food (Subset)</div>
                <div className="text-3xl font-semibold text-white mt-2">
                  {transactionHierarchy.groceryFood.txnCount.toLocaleString()}
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  {((transactionHierarchy.groceryFood.txnCount / transactionHierarchy.grocery.txnCount) * 100).toFixed(1)}% of Grocery
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Q&A strip */}
      {mode==='Q&A' && (
        <div className="px-6 md:px-10 py-6">
          <Card className="bg-neutral-900/60 border-neutral-800 rounded-2xl">
            <CardContent className="p-6">
              <div className="text-lg font-medium text-white mb-3">Ask BasketBridge (Azure OpenAI)</div>
              <div className="flex gap-2">
                <Input value={ask} onChange={(e)=> setAsk(e.target.value)} placeholder="e.g., What if we push +3% conversion to Home?" className="bg-neutral-900 border-neutral-800 text-white" />
                <Button onClick={onAsk} disabled={busy} className="bg-white text-black hover:bg-neutral-200">{busy? 'Thinking…':'Ask'}</Button>
              </div>
              {answer && <div className="mt-4 text-sm text-neutral-200 whitespace-pre-wrap">{answer}</div>}
              {!answer && !busy && <div className="mt-2 text-xs text-neutral-400">The model receives the KPIs and mix categories as structured JSON. No database required.</div>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 md:px-10 py-8 text-neutral-600 text-xs border-t border-neutral-900 mt-8">
        © {new Date().getFullYear()} BasketBridge • TWG Internal • Designed for Board & ELT. Update PASSCODE & Azure env vars before sharing.
      </div>
    </div>
  );
}