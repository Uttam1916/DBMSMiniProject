'use client';

import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Clock,
  Layers,
  Database,
  AlertCircle,
  Code,
} from 'lucide-react';

export default function SqlConsoleTab() {
  const [queriesList, setQueriesList] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('q1-null-embeddings');
  const [customSql, setCustomSql] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/queries/run')
      .then((res) => res.json())
      .then((data) => {
        if (data.queries) {
          setQueriesList(data.queries);
          if (data.queries.length > 0) {
            setSelectedKey(data.queries[0].key);
            setCustomSql(data.queries[0].sql);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSelectQuery = (key: string) => {
    setSelectedKey(key);
    const q = queriesList.find((item) => item.key === key);
    if (q) {
      setCustomSql(q.sql);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

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
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = () => {
    if (!customSql) return;
    navigator.clipboard.writeText(customSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedQuery = queriesList.find((q) => q.key === selectedKey);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Terminal className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Interactive SQL Console &amp; TA Demonstration Suite
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Execute core DBMS queries directly against live PostgreSQL: Multi-table JOINs, Views, PL/pgSQL Vector functions, Aggregations with FILTER, and Subqueries.
            </p>
          </div>
        </div>
      </div>

      {/* Query Selector & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Predefined Queries List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            TA Demo Queries (Rubric Sequence)
          </div>

          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {queriesList.map((q) => {
              const isSelected = selectedKey === q.key;
              return (
                <button
                  key={q.key}
                  onClick={() => handleSelectQuery(q.key)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="font-semibold">{q.title}</div>
                  <div
                    className={`text-[10px] mt-0.5 truncate ${
                      isSelected ? 'text-indigo-300' : 'text-slate-500'
                    }`}
                  >
                    {q.category}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: SQL Editor & Output */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col">
          {/* Query Meta Info */}
          {selectedQuery && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block mb-0.5">
                {selectedQuery.title}
              </span>
              <p className="text-slate-600">{selectedQuery.description}</p>
            </div>
          )}

          {/* SQL Editor Area */}
          <div className="relative">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center space-x-1">
                <Code className="w-3.5 h-3.5 text-indigo-600" />
                <span>SQL Query Statement</span>
              </span>
              <button
                onClick={handleCopy}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center space-x-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={5}
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-lg bg-slate-950 text-slate-100 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 selection:bg-indigo-700"
              placeholder="Enter SELECT SQL statement..."
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Only SELECT queries are allowed via custom console.
            </span>
            <button
              onClick={handleExecute}
              disabled={isExecuting || !customSql.trim()}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin text-indigo-400' : 'text-emerald-400'}`} />
              <span>{isExecuting ? 'Executing...' : 'Run Query'}</span>
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Execution Results */}
          {result && (
            <div className="space-y-2 mt-2 pt-3 border-t border-slate-100 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-semibold text-slate-800">
                      {result.execution_time_ms} ms
                    </span>
                  </span>
                  <span>•</span>
                  <span>
                    Returned{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {result.row_count}
                    </span>{' '}
                    row(s)
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                    <tr>
                      {result.fields.map((field: string) => (
                        <th key={field} className="px-3 py-2 whitespace-nowrap">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {result.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={result.fields.length}
                          className="px-3 py-4 text-center text-slate-400"
                        >
                          (0 rows returned)
                        </td>
                      </tr>
                    ) : (
                      result.rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {result.fields.map((field: string) => {
                            const val = row[field];
                            let displayVal =
                              val === null
                                ? 'NULL'
                                : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val);
                            return (
                              <td
                                key={field}
                                className={`px-3 py-1.5 whitespace-nowrap ${
                                  val === null ? 'text-slate-400 italic' : 'text-slate-800'
                                }`}
                              >
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
