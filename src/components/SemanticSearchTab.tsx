'use client';

import React, { useState } from 'react';
import { ItemMatch } from '@/types';
import {
  Sparkles,
  Search,
  Zap,
  ArrowRight,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';

interface SemanticSearchTabProps {
  matches: ItemMatch[];
  onRefreshMatches: () => Promise<void>;
  onSelectItemById?: (itemId: number) => void;
}

export default function SemanticSearchTab({
  matches,
  onRefreshMatches,
  onSelectItemById,
}: SemanticSearchTabProps) {
  const [queryText, setQueryText] = useState('black stainless-steel bottle');
  const [targetType, setTargetType] = useState<'FOUND' | 'LOST'>('FOUND');
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    vector_results: any[];
    keyword_results: any[];
    model: string;
    metric: string;
    dimensions: number;
  } | null>(null);

  const presets = [
    { label: 'Bottle', text: 'dark metal water bottle' },
    { label: 'Charger', text: '65 watt laptop power adapter' },
    { label: 'Backpack', text: 'blue student travel rucksack' },
    { label: 'Notebook', text: 'black leather diary journal' },
    { label: 'Headset', text: 'sony over-ear wireless audio' },
  ];

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryText.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText.trim(),
          item_type: targetType,
          limit: 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }
      setSearchResults(data);
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshMatches();
    } catch (err: any) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Vector Similarity Demonstration</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Semantic Vector Search vs Traditional Keyword Search
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Compare how PostgreSQL 16 with pgvector HNSW dense cosine search (<code className="font-mono text-indigo-600">&lt;=&gt;</code>) captures semantic meaning across synonyms, compared to standard relational <code className="font-mono text-indigo-600">ILIKE</code> queries.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition disabled:opacity-50 self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Re-indexing...' : 'Re-index Matches Table'}</span>
          </button>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Enter any natural language item description (e.g. 'black metal bottle with silver cap')..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              aria-label="Target Item Type"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="FOUND">Search in FOUND items</option>
              <option value="LOST">Search in LOST items</option>
            </select>

            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{isSearching ? 'Computing...' : 'Test Comparison'}</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1">Try example:</span>
            {presets.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQueryText(p.text);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition text-[11px]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Side-by-Side Results Display */}
      {searchResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: pgvector Cosine Similarity */}
          <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Vector Cosine Similarity (pgvector)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    HNSW 384-dim • 1 - (embedding &lt;=&gt; query_vector)
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {searchResults.vector_results.length} matches
              </span>
            </div>

            <div className="space-y-2.5">
              {searchResults.vector_results.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No vector matches found.
                </div>
              ) : (
                searchResults.vector_results.map((res: any, idx: number) => {
                  const scorePct = Math.round(res.similarity_score * 100);
                  return (
                    <div
                      key={res.item_id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/30 transition text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          #{idx + 1}. #{res.item_id} {res.title}
                        </span>
                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-xs ${
                              scorePct >= 70
                                ? 'text-emerald-700'
                                : scorePct >= 50
                                ? 'text-indigo-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {scorePct}% match
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-[11px] line-clamp-2">
                        {res.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Zone: {res.location_name} • {res.category_name}</span>
                        <span className="font-mono text-[10px] text-indigo-600">
                          Score: {res.similarity_score}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Traditional ILIKE Keyword Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Traditional Relational Keyword (ILIKE)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    title ILIKE &apos;%query%&apos; OR description ILIKE &apos;%query%&apos;
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {searchResults.keyword_results.length} matches
              </span>
            </div>

            <div className="space-y-2.5">
              {searchResults.keyword_results.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <span className="font-medium text-slate-600 block">
                    Zero Keyword Matches
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Exact character sequence was not present in title or description. Vector search succeeded by understanding semantic equivalence.
                  </span>
                </div>
              ) : (
                searchResults.keyword_results.map((res: any, idx: number) => (
                  <div
                    key={res.item_id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1"
                  >
                    <div className="font-semibold text-slate-900">
                      #{idx + 1}. #{res.item_id} {res.title}
                    </div>
                    <p className="text-slate-600 text-[11px] line-clamp-2">
                      {res.description}
                    </p>
                    <div className="text-[11px] text-slate-500 pt-1">
                      Zone: {res.location_name} • {res.category_name}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persisted Automatic Matches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Persisted Match Suggestions (<code className="font-mono text-indigo-700">item_match</code> Table)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Top candidate pairings generated using <code className="font-mono text-indigo-600">find_matching_items(lost_item_id, limit)</code>.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {matches.length} Total Pairings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Lost Item</th>
                <th className="px-4 py-3">Candidate Found Item</th>
                <th className="px-4 py-3">Similarity Score</th>
                <th className="px-4 py-3">Match Status</th>
                <th className="px-4 py-3">Found Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No persisted matches in item_match table. Click &quot;Re-index Matches Table&quot; above.
                  </td>
                </tr>
              ) : (
                matches.map((m, idx) => {
                  const scorePct = Math.round(m.similarity_score * 100);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900">
                          #{m.lost_item_id} {m.lost_title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {m.lost_description}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900">
                          #{m.found_item_id} {m.found_title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {m.found_description}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-mono font-bold text-xs ${
                              scorePct >= 70
                                ? 'text-emerald-700'
                                : scorePct >= 50
                                ? 'text-indigo-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {scorePct}%
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                scorePct >= 70
                                  ? 'bg-emerald-500'
                                  : scorePct >= 50
                                  ? 'bg-indigo-500'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${Math.max(scorePct, 5)}%` }}
                            />
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {m.similarity_score}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {m.match_status}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {m.found_location}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
