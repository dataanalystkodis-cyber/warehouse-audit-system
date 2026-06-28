import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, Package, DollarSign, MapPin, Loader2, Plus, Edit2,
  Eye, Trash2, Filter, Download, TrendingUp, ZapOff, Info, ChevronDown,
} from 'lucide-react';
import type { Product } from '../lib/types';

type ProductWithAudit = Product & {
  auditStatus?: string;
  physicalQuantity?: number;
  variance?: number;
  varianceValue?: number;
};

export function ProductsViewEnhanced() {
  const [products, setProducts] = useState<ProductWithAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'value'>('name');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Fetch all products with warehouse info
      const { data: prods } = await supabase
        .from('products')
        .select('*, warehouses(id, code, name, address)');

      // Fetch audit details to get physical quantities
      const { data: auditDetails } = await supabase
        .from('audit_details')
        .select('product_id, physical_quantity, system_quantity, variance_quantity, variance_value, status');

      // Create audit map
      const auditMap = new Map();
      auditDetails?.forEach((ad) => {
        auditMap.set(ad.product_id, ad);
      });

      // Enrich products with audit data
      const enrichedProducts = (prods || []).map((p: any) => ({
        ...p,
        auditStatus: auditMap.get(p.id)?.status,
        physicalQuantity: auditMap.get(p.id)?.physical_quantity,
        variance: auditMap.get(p.id)?.variance_quantity,
        varianceValue: auditMap.get(p.id)?.variance_value,
      }));

      setProducts(enrichedProducts);

      // Extract unique categories and warehouses
      const catSet = new Set(prods?.map((p: any) => p.category).filter(Boolean));
      const whSet = new Map();
      prods?.forEach((p: any) => {
        if (p.warehouses) whSet.set(p.warehouses.id, p.warehouses.name);
      });

      setCategories(Array.from(catSet).sort());
      setWarehouses(Array.from(whSet.entries()).map(([id, name]) => ({ id, name })));
      setLoading(false);
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(term) ||
        p.product_code.toLowerCase().includes(term) ||
        (p.brand?.toLowerCase().includes(term) ?? false)
      );
    }

    if (filterCategory) {
      filtered = filtered.filter((p) => p.category === filterCategory);
    }

    if (filterWarehouse) {
      filtered = filtered.filter((p) => p.warehouse_id === filterWarehouse);
    }

    // Sort
    switch (sortBy) {
      case 'price':
        filtered.sort((a, b) => (b.unit_price ?? 0) - (a.unit_price ?? 0));
        break;
      case 'stock':
        filtered.sort((a, b) => (b.system_quantity ?? 0) - (a.system_quantity ?? 0));
        break;
      case 'value':
        filtered.sort((a, b) =>
          ((b.system_quantity ?? 0) * (b.unit_price ?? 0)) -
          ((a.system_quantity ?? 0) * (a.unit_price ?? 0))
        );
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, searchTerm, filterCategory, filterWarehouse, sortBy]);

  const stats = useMemo(() => ({
    totalProducts: products.length,
    totalValue: products.reduce((s, p) => s + ((p.system_quantity ?? 0) * (p.unit_price ?? 0)), 0),
    audited: products.filter((p) => p.auditStatus).length,
    discrepancies: products.filter((p) => p.variance !== 0 && p.variance !== null).length,
  }), [products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Product Inventory</h2>
            <p className="text-slate-500 mt-1">Manage warehouse stock with audit details</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500 font-medium">Total Products</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProducts}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500 font-medium">Total Value</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">${(stats.totalValue / 1000).toFixed(1)}K</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500 font-medium">Audited</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.audited}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500 font-medium">Discrepancies</div>
            <div className={`text-2xl font-bold mt-1 ${stats.discrepancies > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats.discrepancies}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, code, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort: Name</option>
            <option value="price">Sort: Price (High→Low)</option>
            <option value="stock">Sort: Stock Qty</option>
            <option value="value">Sort: Inventory Value</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>

          {(searchTerm || filterCategory || filterWarehouse) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
                setFilterWarehouse('');
              }}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No products found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inventoryValue = (product.system_quantity ?? 0) * (product.unit_price ?? 0);
            const isExpanded = expandedId === product.id;
            const hasDiscrepancy = product.variance !== 0 && product.variance !== null;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-lg border ${
                  hasDiscrepancy ? 'border-rose-200' : 'border-slate-200'
                } overflow-hidden transition-all hover:shadow-md`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : product.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900">{product.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                              {product.product_code}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                              {product.category}
                            </span>
                            {product.warehouse?.name && (
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {product.warehouse.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          ${product.unit_price?.toFixed(2) ?? '0.00'}
                        </div>
                        <div className="text-xs text-slate-500">per unit</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          ${(inventoryValue / 1000).toFixed(1)}K
                        </div>
                        <div className="text-xs text-slate-500">total value</div>
                      </div>

                      {hasDiscrepancy && (
                        <div className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded">
                          Variance: {product.variance}
                        </div>
                      )}

                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Stock Information */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4" /> Stock Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-slate-600">System Stock:</span>
                            <span className="font-bold text-slate-900">{product.system_quantity?.toLocaleString() ?? 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Physical Stock:</span>
                            <span className="font-bold text-slate-900">
                              {product.physicalQuantity?.toLocaleString() ?? 'Not audited'}
                            </span>
                          </div>
                          {product.physicalQuantity !== undefined && (
                            <>
                              <div className="h-px bg-slate-200 my-2" />
                              <div className="flex justify-between">
                                <span className="text-slate-600">Variance:</span>
                                <span
                                  className={`font-bold ${
                                    (product.variance ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {(product.variance ?? 0) >= 0 ? '+' : ''}{product.variance ?? 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Variance Value:</span>
                                <span
                                  className={`font-bold ${
                                    (product.varianceValue ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  ${(product.varianceValue ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" /> Details
                        </h4>
                        <div className="space-y-3">
                          {product.brand && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Brand:</span>
                              <span className="font-medium text-slate-900">{product.brand}</span>
                            </div>
                          )}
                          {product.unit && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Unit:</span>
                              <span className="font-medium text-slate-900">{product.unit}</span>
                            </div>
                          )}
                          {product.zone && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Zone:</span>
                              <span className="font-medium text-slate-900">{product.zone}</span>
                            </div>
                          )}
                          {product.rack_number && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Rack:</span>
                              <span className="font-medium text-slate-900">{product.rack_number}</span>
                            </div>
                          )}
                          {product.bin_number && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Bin:</span>
                              <span className="font-medium text-slate-900">{product.bin_number}</span>
                            </div>
                          )}
                          {product.auditStatus && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Audit Status:</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded capitalize">
                                {product.auditStatus}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">
                        <Eye className="w-4 h-4" /> View History
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
