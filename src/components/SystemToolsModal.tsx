'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  FileSpreadsheet,
  RotateCcw,
  Play,
  Copy,
  Check,
  Sparkles,
  Search,
  AlertCircle,
  Database,
} from 'lucide-react';
import Image from 'next/image';

interface SystemToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetDatabase: () => Promise<void>;
}

export default function SystemToolsModal({
  isOpen,
  onClose,
  onResetDatabase,
}: SystemToolsModalProps) {
  const [activeTab, setActiveTab] = useState<'sql' | 'schema' | 'semantic' | 'reset'>('sql');

  // SQL Console state
  const [queriesList, setQueriesList] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [customSql, setCustomSql] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Schema state
  const [activeDiagram, setActiveDiagram] = useState<'ER' | 'RELATIONAL'>('ER');

  // Semantic search tester state
  const [testQuery, setTestQuery] = useState('black water bottle with metal cap');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    vector_results: any[];
    keyword_results: any[];
  } | null>(null);

  // Reset state
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/queries/run')
      .then((res) => res.json())
      .then((data) => {
        if (data.queries && data.queries.length > 0) {
          setQueriesList(data.queries);
          setSelectedKey(data.queries[0].key);
          setCustomSql(data.queries[0].sql);
        }
      })
      .catch((err) => console.error('Failed to load predefined queries:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectQuery = (key: string) => {
    setSelectedKey(key);
    const q = queriesList.find((item) => item.key === key);
    if (q) setCustomSql(q.sql);
  };

  const handleExecuteSql = async () => {
    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await fetch('/api/queries/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedKey,
          custom_sql: customSql,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Query failed');
      }
      setQueryResult(data);
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopySql = () => {
    if (!customSql) return;
    navigator.clipboard.writeText(customSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunSemanticSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery.trim() }),
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirm('Reset database back to clean baseline state? This will clear test items and restore demo records.')) {
      return;
    }
    setIsResetting(true);
    try {
      await onResetDatabase();
      setResetMessage('Baseline demo database successfully restored!');
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const selectedQueryMeta = queriesList.find((q) => q.key === selectedKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0 bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-mono font-semibold">
              SQL
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                DBMS Level 3 System &amp; Evaluation Tools
              </h2>
              <p className="text-[11px] text-slate-500">
                Interactive verification suite for evaluation queries, schema inspector, and semantic retrieval.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-1.5 space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'sql'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Evaluation Queries</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'schema'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>ER &amp; Relational Schema</span>
          </button>

          <button
            onClick={() => setActiveTab('semantic')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'semantic'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Semantic vs Keyword Test</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'reset'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Database Reset</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* TAB 1: SQL Console */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Select Demonstration Query:
                </label>
                <select
                  value={selectedKey}
                  onChange={(e) => handleSelectQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  {queriesList.map((q) => (
                    <option key={q.key} value={q.key}>
                      [{q.category}] {q.title}
                    </option>
                  ))}
                </select>
                {selectedQueryMeta && (
                  <p className="text-[11px] text-slate-500 mt-1">{selectedQueryMeta.description}</p>
                )}
              </div>

              {/* SQL Text Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-[11px]">Query Text (Read-Only SELECT or WITH):</span>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center space-x-1 text-[11px] text-slate-600 hover:text-slate-900"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-emerald-400 focus:border-slate-700 focus:outline-none"
                />
              </div>

              {/* Execute Button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleExecuteSql}
                  disabled={isExecuting || !customSql.trim()}
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{isExecuting ? 'Executing in PostgreSQL...' : 'Execute Query'}</span>
                </button>

                {queryResult && (
                  <span className="text-xs text-slate-500">
                    Execution Time: <strong className="font-mono text-slate-800">{queryResult.execution_time_ms} ms</strong> • Rows: <strong className="font-mono text-slate-800">{queryResult.row_count}</strong>
                  </span>
                )}
              </div>

              {/* Query Error */}
              {queryError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {queryError}
                </div>
              )}

              {/* Query Result Table */}
              {queryResult && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          {queryResult.fields?.map((f: string) => (
                            <th key={f} className="px-3 py-2 font-semibold">
                              {f}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {queryResult.rows?.map((row: any, rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {queryResult.fields?.map((f: string) => (
                              <td key={f} className="px-3 py-2 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                {typeof row[f] === 'boolean'
                                  ? String(row[f])
                                  : row[f] !== null
                                  ? String(row[f])
                                  : 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Schema & ER Explorer */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveDiagram('ER')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeDiagram === 'ER'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Entity-Relationship (ER) Diagram
                </button>
                <button
                  onClick={() => setActiveDiagram('RELATIONAL')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeDiagram === 'RELATIONAL'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  3NF Relational Schema Diagram
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 p-2 bg-slate-50 flex items-center justify-center min-h-[300px]">
                {activeDiagram === 'ER' ? (
                  <Image
                    src="/lost_found_ER.png"
                    alt="Entity-Relationship Diagram"
                    width={800}
                    height={450}
                    className="max-h-[360px] w-auto object-contain rounded"
                  />
                ) : (
                  <Image
                    src="/lost_found_relational_schema.png"
                    alt="Relational Schema Diagram"
                    width={800}
                    height={450}
                    className="max-h-[360px] w-auto object-contain rounded"
                  />
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1">
                <span className="font-semibold text-slate-800 block">3NF Relational Architecture:</span>
                <p className="text-slate-600">
                  Comprises 6 normalized tables (<code className="font-mono text-slate-800">users</code>, <code className="font-mono text-slate-800">category</code>, <code className="font-mono text-slate-800">location</code>, <code className="font-mono text-slate-800">item</code>, <code className="font-mono text-slate-800">item_match</code>, <code className="font-mono text-slate-800">claim</code>) with foreign key integrity, HNSW cosine vector index, and partial unique constraint.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Semantic vs Keyword Search Tester */}
          {activeTab === 'semantic' && (
            <div className="space-y-4">
              <form onSubmit={handleRunSemanticSearch} className="space-y-2">
                <label className="text-xs font-medium text-slate-700 block">
                  Test Query (Demonstrating Vocabulary Mismatch Resolution):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="e.g., black water bottle with metal cap"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !testQuery.trim()}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {isSearching ? 'Comparing...' : 'Run Comparison'}
                  </button>
                </div>
              </form>

              {searchResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Semantic Results */}
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-xs">
                        Dense Vector Cosine Similarity (pgvector)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-700">
                        HNSW Operator &lt;=&gt;
                      </span>
                    </div>

                    {searchResults.vector_results.length === 0 ? (
                      <p className="text-xs text-slate-400">No vector results returned.</p>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.vector_results.map((r, i) => (
                          <div key={i} className="rounded border border-slate-100 bg-slate-50 p-2 text-xs space-y-0.5">
                            <div className="flex items-center justify-between font-medium text-slate-900">
                              <span>#{r.item_id} - {r.title}</span>
                              <span className="font-mono text-emerald-700 font-semibold">
                                {Math.round(r.similarity_score * 100)}%
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px] line-clamp-1">{r.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Keyword Results */}
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-xs">
                        Traditional Keyword Search (SQL ILIKE)
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-700">
                        Exact Substring
                      </span>
                    </div>

                    {searchResults.keyword_results.length === 0 ? (
                      <div className="p-4 text-center rounded bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                        <strong>0 matches found.</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Traditional SQL ILIKE fails when vocabulary differs (e.g. &quot;black bottle&quot; vs &quot;dark metal bottle&quot;).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.keyword_results.map((r, i) => (
                          <div key={i} className="rounded border border-slate-100 bg-slate-50 p-2 text-xs space-y-0.5">
                            <div className="font-medium text-slate-900">#{r.item_id} - {r.title}</div>
                            <p className="text-slate-500 text-[11px] line-clamp-1">{r.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Database Reset */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Baseline Demonstration Reset</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Restores the database back to clean baseline state for TA evaluation:
                  removes test-reported items, resets claim statuses to PENDING, resets all item statuses to OPEN, and recalculates candidate match pairings.
                </p>

                {resetMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    {resetMessage}
                  </div>
                )}

                <button
                  onClick={handleResetDb}
                  disabled={isResetting}
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>{isResetting ? 'Restoring baseline records...' : 'Reset Demo Database'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-slate-50 shrink-0">
          <div className="text-[11px] text-slate-500">
            PostgreSQL 16 + pgvector HNSW Engine
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
