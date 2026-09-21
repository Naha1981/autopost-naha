import React from 'react';
import { Building2, Plus, Share2, Film, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BrandsViewProps {
  onOpenAddBrand: () => void;
  onSelectBrandFilter: (brandId: string) => void;
}

export const BrandsView: React.FC<BrandsViewProps> = ({ onOpenAddBrand, onSelectBrandFilter }) => {
  const { brands, accounts, contentList, selectedBrandId, setSelectedBrandId } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Client Brands & Portfolios</h1>
          <p className="text-xs text-slate-500">
            Tenant partition for NahaLabs creative accounts and commercial clients
          </p>
        </div>

        <button
          onClick={onOpenAddBrand}
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Client Brand</span>
        </button>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {brands.map((brand) => {
          const brandAccounts = accounts.filter((a) => a.brandId === brand.id);
          const brandContent = contentList.filter((c) => c.brandId === brand.id);
          const isSelected = selectedBrandId === brand.id;

          return (
            <div
              key={brand.id}
              className={`bg-white rounded-2xl border transition-all p-6 flex flex-col justify-between shadow-sm ${
                isSelected ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-slate-200 hover:shadow-md'
              }`}
            >
              <div>
                {/* Brand Color Bar & Code */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: brand.color }}
                    />
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {brand.code}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> ACTIVE FILTER
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedBrandId(brand.id)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Filter Workspace
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{brand.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                  {brand.description || 'No description provided.'}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4 text-xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Share2 className="w-3 h-3" /> Accounts
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {brandAccounts.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Film className="w-3 h-3" /> Videos
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {brandContent.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedBrandId(brand.id);
                    onSelectBrandFilter(brand.id);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors text-center cursor-pointer"
                >
                  View Brand Content ({brandContent.length})
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
