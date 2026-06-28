import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Package, CheckCircle2, Clock, TrendingUp,
  DollarSign, Target, BarChart3, Loader2, Warehouse as WarehouseIcon,
  AlertCircle, Eye, Eye as EyeIcon, Zap, PieChart,
} from 'lucide-react';

type DashboardStats = {
  totalProducts: number;
  totalAudited: number;
  pendingProducts: number;
  totalVarianceQty: number;
  totalVarianceValue: number;
  accuracyPct: number;
  totalSystemStock: number;
  totalPhysicalStock: number;
  totalInventoryValue: number;
  discrepancies: number;
  warehouseSummary: {
    warehouse: string;
    products: number;
    audited: number;
    variance: number;
    systemStock: number;
    physicalStock: number;
    value: number;
  }[];
  categorySummary: { category: string; products: number; audited: number; variance: number; systemStock: number; physicalStock: number; value: number }[];
  auditorPerformance: { auditor: string; counted: number; flagged: number; accuracy: number }[];
  topDiscrepancies: { productCode: string; productName: string; systemQty: number; physicalQty: number; variance: number; value: number }[];
};

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [prodRes, auditRes, headerRes] = await Promise.all([
        supabase.from('products').select('id, product_code, name, category, warehouse_id, system_quantity, unit_price, warehouses(code, name)', { count: 'exact' }),
        supabase.from('audit_details').select('id, status, physical_quantity, system_quantity, variance_quantity, variance_value, unit_price, counted_by, product_id, products(product_code, name), users(full_name)'),
        supabase.from('audit_header').select('*'),
      ]);

      const products = prodRes.data || [];
      const auditDetails = auditRes.data || [];
      const totalProducts = prodRes.count || 0;

      // Calculate totals
      const totalSystemStock = products.reduce((sum: number, p: any) => sum + (p.system_quantity || 0), 0);
      const totalInventoryValue = products.reduce((sum: number, p: any) => sum + ((p.system_quantity || 0) * (p.unit_price || 0)), 0);

      const audited = auditDetails.filter((d: any) => d.status === 'counted' || d.status === 'flagged' || d.status === 'recounted');
      const totalAudited = audited.length;
      const pendingProducts = totalProducts - totalAudited;

      const totalPhysicalStock = audited.reduce((sum: number, d: any) => sum + (d.physical_quantity || 0), 0);
      const totalVarianceQty = audited.reduce((sum: number, d: any) => sum + (d.variance_quantity || 0), 0);
      const totalVarianceValue = audited.reduce((sum: number, d: any) => sum + parseFloat(d.variance_value || '0'), 0);

      const matched = audited.filter((d: any) => d.variance_quantity === 0).length;
      const accuracyPct = totalAudited > 0 ? Math.round((matched / totalAudited) * 100) : 0;
      const discrepancies = audited.filter((d: any) => d.variance_quantity !== 0).length;

      // Warehouse summary with stock info
      const whMap = new Map<string, { products: number; audited: number; variance: number; systemStock: number; physicalStock: number; value: number }>();
      products.forEach((p: any) => {
        const whName = p.warehouses?.name || 'Unassigned';
        if (!whMap.has(whName)) whMap.set(whName, { products: 0, audited: 0, variance: 0, systemStock: 0, physicalStock: 0, value: 0 });
        const wh = whMap.get(whName)!;
        wh.products++;
        wh.systemStock += p.system_quantity || 0;
        wh.value += ((p.system_quantity || 0) * (p.unit_price || 0));
      });

      auditDetails.forEach((d: any) => {
        if (d.products?.warehouse_id) {
          const whName = d.products.warehouses?.name || 'Unassigned';
          if (whMap.has(whName)) {
            const wh = whMap.get(whName)!;
            if (d.status === 'counted' || d.status === 'flagged') wh.audited++;
            wh.physicalStock += d.physical_quantity || 0;
          }
        }
      });

      const warehouseSummary = Array.from(whMap.entries())
        .map(([warehouse, v]) => ({ warehouse, ...v }))
        .sort((a, b) => b.systemStock - a.systemStock);

      // Category summary with stock info
      const catMap = new Map<string, { products: number; audited: number; variance: number; systemStock: number; physicalStock: number; value: number }>();
      products.forEach((p: any) => {
        if (!catMap.has(p.category)) catMap.set(p.category, { products: 0, audited: 0, variance: 0, systemStock: 0, physicalStock: 0, value: 0 });
        const cat = catMap.get(p.category)!;
        cat.products++;
        cat.systemStock += p.system_quantity || 0;
        cat.value += ((p.system_quantity || 0) * (p.unit_price || 0));
      });

      auditDetails.forEach((d: any) => {
        if (d.products?.category) {
          const cat = catMap.get(d.products.category);
          if (cat) {
            if (d.status === 'counted' || d.status === 'flagged') cat.audited++;
            cat.physicalStock += d.physical_quantity || 0;
          }
        }
      });

      const categorySummary = Array.from(catMap.entries())
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.systemStock - a.systemStock);

      // Auditor performance
      const auditorMap = new Map<string, { counted: number; flagged: number; matched: number }>();
      audited.forEach((d: any) => {
        const name = d.users?.full_name || 'Unknown';
        if (!auditorMap.has(name)) auditorMap.set(name, { counted: 0, flagged: 0, matched: 0 });
        const entry = auditorMap.get(name)!;
        entry.counted++;
        if (d.status === 'flagged') entry.flagged++;
        if (d.variance_quantity === 0) entry.matched++;
      });

      const auditorPerformance = Array.from(auditorMap.entries())
        .map(([auditor, v]) => ({
          auditor,
          counted: v.counted,
          flagged: v.flagged,
          accuracy: v.counted > 0 ? Math.round((v.matched / v.counted) * 100) : 0,
        }))
        .sort((a, b) => b.counted - a.counted);

      // Top discrepancies
      const topDiscrepancies = audited
        .filter((d: any) => d.variance_quantity !== 0)
        .map((d: any) => ({
          productCode: d.products?.product_code || 'N/A',
          productName: d.products?.name || 'Unknown',
          systemQty: d.system_quantity || 0,
          physicalQty: d.physical_quantity || 0,
          variance: d.variance_quantity || 0,
          value: parseFloat(d.variance_value || '0'),
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 5);

      setStats({
        totalProducts,
        totalAudited,
        pendingProducts,
        totalVarianceQty,
        totalVarianceValue,
        accuracyPct,
        totalSystemStock,
        totalPhysicalStock,
        totalInventoryValue,
        discrepancies,
        warehouseSummary,
        categorySummary,
        auditorPerformance,
        topDiscrepancies,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const s = stats!;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Warehouse Dashboard</h2>
        <p className="text-slate-500 mt-2">Complete inventory audit & stock management overview</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={Package} label="Total Products" value={s.totalProducts.toLocaleString()} color="blue" />
        <KPICard icon={Zap} label="System Stock" value={s.totalSystemStock.toLocaleString()} color="purple" />
        <KPICard icon={EyeIcon} label="Physical Stock" value={s.totalPhysicalStock.toLocaleString()} color="cyan" />
        <KPICard icon={DollarSign} label="Inventory Value" value={`$${(s.totalInventoryValue / 1000).toFixed(1)}K`} color="green" />
      </div>

      {/* Audit Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KPICard icon={CheckCircle2} label="Audited" value={s.totalAudited.toLocaleString()} color="emerald" />
        <KPICard icon={Clock} label="Pending" value={s.pendingProducts.toLocaleString()} color="amber" />
        <KPICard icon={AlertCircle} label="Discrepancies" value={s.discrepancies.toLocaleString()} color="rose" />
        <KPICard icon={Target} label="Accuracy" value={`${s.accuracyPct}%`} color="blue" />
        <KPICard icon={TrendingUp} label="Variance" value={`$${Math.abs(s.totalVarianceValue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color={s.totalVarianceValue >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Stock Comparison */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-900">Stock Comparison</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">System Stock</span>
                <span className="text-sm font-bold text-slate-900">{s.totalSystemStock.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">Physical Stock</span>
                <span className="text-sm font-bold text-slate-900">{s.totalPhysicalStock.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: s.totalSystemStock > 0 ? `${(s.totalPhysicalStock / s.totalSystemStock) * 100}%` : '0%' }} />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 font-medium">Variance</span>
                <span className={`text-sm font-bold ${(s.totalPhysicalStock - s.totalSystemStock) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(s.totalPhysicalStock - s.totalSystemStock) >= 0 ? '+' : ''}{(s.totalPhysicalStock - s.totalSystemStock).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-900">Top Categories by Stock Value</h3>
          </div>
          <div className="space-y-3">
            {s.categorySummary.slice(0, 6).map((c) => (
              <div key={c.category} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{c.category}</div>
                  <div className="text-xs text-slate-500">{c.products} products</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">${(c.value / 1000).toFixed(1)}K</div>
                  <div className="text-xs text-slate-500">{c.systemStock} units</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Discrepancies */}
      {s.topDiscrepancies.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold text-slate-900">Top Discrepancies (by Value)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Product Code</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Product Name</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">System Qty</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Physical Qty</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Variance</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Value Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.topDiscrepancies.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-sm font-medium text-slate-900">{d.productCode}</td>
                    <td className="py-3 px-3 text-sm text-slate-700">{d.productName}</td>
                    <td className="py-3 px-3 text-right text-sm text-slate-700">{d.systemQty}</td>
                    <td className="py-3 px-3 text-right text-sm text-slate-700">{d.physicalQty}</td>
                    <td className="py-3 px-3 text-right text-sm font-medium"><span className={d.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{d.variance >= 0 ? '+' : ''}{d.variance}</span></td>
                    <td className="py-3 px-3 text-right text-sm font-bold"><span className={d.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}>${Math.abs(d.value).toFixed(2)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Auditor Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-900">Auditor Performance</h3>
          </div>
          {s.auditorPerformance.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No audit counts recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {s.auditorPerformance.map((a) => (
                <div key={a.auditor} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{a.auditor}</div>
                    <div className="text-xs text-slate-500">{a.counted} items counted</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{a.accuracy}%</div>
                      <div className="text-xs text-slate-500">accuracy</div>
                    </div>
                    {a.flagged > 0 && (
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded">
                        {a.flagged} flagged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warehouse Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <WarehouseIcon className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-900">Warehouse Stock Overview</h3>
          </div>
          <div className="space-y-3">
            {s.warehouseSummary.slice(0, 5).map((w) => (
              <div key={w.warehouse} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <div className="text-sm font-medium text-slate-900">{w.warehouse}</div>
                  <div className="text-sm font-bold text-slate-900">${(w.value / 1000).toFixed(1)}K</div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{w.systemStock} units (system)</span>
                  <span>{w.physicalStock} units (physical)</span>
                </div>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500" style={{ width: '50%' }} />
                  <div className="bg-emerald-500" style={{ width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'green';
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
