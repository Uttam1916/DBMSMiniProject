'use client';

import React, { useState } from 'react';
import { Database, Image as ImageIcon, Layers, FileText, CheckCircle2 } from 'lucide-react';

export default function SchemaTab() {
  const [activeDiagram, setActiveDiagram] = useState<'ER' | 'RELATIONAL'>('ER');

  const tables = [
    {
      name: 'users',
      pk: 'user_id (BIGINT)',
      description: 'Campus members authorized to report items or file claims.',
      constraints: 'email UNIQUE, CHECK (role IN (\'STUDENT\', \'STAFF\', \'ADMIN\'))',
      relationships: 'Referenced by item(reported_by) and claim(claimed_by)',
    },
    {
      name: 'category',
      pk: 'category_id (INTEGER)',
      description: 'Item taxonomy (Electronics, Bags, Stationery, Personal Items).',
      constraints: 'name UNIQUE, NOT NULL',
      relationships: 'Referenced by item(category_id)',
    },
    {
      name: 'location',
      pk: 'location_id (INTEGER)',
      description: 'Campus physical zones (Library, Cafeteria, Block A).',
      constraints: 'name UNIQUE, NOT NULL',
      relationships: 'Referenced by item(location_id)',
    },
    {
      name: 'item',
      pk: 'item_id (BIGINT)',
      description: 'Reported belongings containing 384-dimensional dense vectors.',
      constraints: 'item_type CHECK (\'LOST\', \'FOUND\'), status CHECK (\'OPEN\', \'CLAIMED\', \'RESOLVED\', \'CLOSED\'), embedding VECTOR(384)',
      relationships: 'FK to users, category, location ON DELETE RESTRICT; referenced by item_match and claim',
    },
    {
      name: 'item_match',
      pk: '(lost_item_id, found_item_id)',
      description: 'Candidate lost-to-found pairings with cosine similarity scores.',
      constraints: 'similarity_score CHECK (-1 TO 1), match_status CHECK (\'SUGGESTED\', \'ACCEPTED\', \'REJECTED\'), lost_item_id <> found_item_id',
      relationships: 'Composite PK, FK to item(item_id) ON DELETE CASCADE',
    },
    {
      name: 'claim',
      pk: 'claim_id (BIGINT)',
      description: 'Ownership claims filed against found items with proof details.',
      constraints: 'claim_status CHECK (\'PENDING\', \'APPROVED\', \'REJECTED\'), Partial Unique Index idx_one_approved_claim_per_item',
      relationships: 'FK to users(claimed_by), FK to item(item_id) ON DELETE RESTRICT',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Database Architecture &amp; Schema Design
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Normalized 3NF relational schema paired with pgvector dense vector embeddings. Designed to guarantee ACID referential integrity while providing zero-latency semantic similarity calculations.
        </p>

        {/* Diagram Toggle */}
        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveDiagram('ER')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeDiagram === 'ER'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ER Diagram (Chen / Crow&apos;s Foot)
          </button>
          <button
            onClick={() => setActiveDiagram('RELATIONAL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeDiagram === 'RELATIONAL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Relational Schema Diagram
          </button>
        </div>
      </div>

      {/* Visual Diagram Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-hidden flex flex-col items-center">
        <div className="w-full text-xs text-slate-500 mb-2 flex items-center justify-between">
          <span className="font-semibold text-slate-800">
            {activeDiagram === 'ER' ? 'Entity-Relationship Diagram' : 'Relational Schema Diagram'}
          </span>
          <span className="text-[11px] text-slate-400">
            Stored in repository as {activeDiagram === 'ER' ? 'lost_found_ER.png' : 'lost_found_relational_schema.png'}
          </span>
        </div>

        <div className="max-w-4xl w-full border border-slate-100 rounded-lg p-2 bg-slate-50 flex items-center justify-center min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeDiagram === 'ER' ? '/lost_found_ER.png' : '/lost_found_relational_schema.png'}
            alt={activeDiagram === 'ER' ? 'Entity-Relationship Diagram' : 'Relational Schema'}
            className="max-h-[500px] object-contain rounded"
          />
        </div>
      </div>

      {/* Relational Data Dictionary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Data Dictionary &amp; Relational Schema Specification
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Identifies tables, primary keys, foreign key constraints, and check domains.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Primary Key</th>
                <th className="px-4 py-3">Constraints &amp; Rules</th>
                <th className="px-4 py-3">Relationships</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {tables.map((t) => (
                <tr key={t.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                    {t.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-800">
                    {t.pk}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600 max-w-xs">
                    {t.constraints}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">
                    {t.relationships}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs">
                    {t.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Features Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Triggers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active Database Triggers (PL/pgSQL)
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-indigo-700 block">
                sync_item_status_after_claim
              </span>
              <span className="text-slate-600 mt-0.5 block">
                Fired <code className="font-mono">AFTER UPDATE OF claim_status ON claim</code>. When an Admin sets a claim status to <code className="font-mono text-emerald-700">APPROVED</code>, this trigger automatically mutates the corresponding item&apos;s status from <code className="font-mono">OPEN</code> to <code className="font-mono">CLAIMED</code> inside the transaction.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-indigo-700 block">
                validate_claim_item
              </span>
              <span className="text-slate-600 mt-0.5 block">
                Fired <code className="font-mono">BEFORE INSERT OR UPDATE ON claim</code>. Enforces that claims can only ever be filed on <code className="font-mono">OPEN</code> <code className="font-mono">FOUND</code> items, preventing fraudulent or nonsensical claims at the engine level.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-indigo-700 block">
                validate_item_match_types
              </span>
              <span className="text-slate-600 mt-0.5 block">
                Fired <code className="font-mono">BEFORE INSERT OR UPDATE ON item_match</code>. Guarantees that pairings strictly link a <code className="font-mono">LOST</code> item to a <code className="font-mono">FOUND</code> item.
              </span>
            </div>
          </div>
        </div>

        {/* Database Views & Functions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Database Views &amp; Stored Functions
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-indigo-700 block">
                find_matching_items(lost_item_id, limit)
              </span>
              <span className="text-slate-600 mt-0.5 block">
                PL/pgSQL stored function that computes vector cosine distance (<code className="font-mono">1 - (lost.embedding &lt;=&gt; f.embedding)</code>) filtered to open found items using the HNSW index.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-indigo-700 block">
                pending_claims_view
              </span>
              <span className="text-slate-600 mt-0.5 block">
                Pre-joins claims with claimant credentials and item descriptions, exposing clean administrative projection.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-indigo-700 block">
                item_details_view
              </span>
              <span className="text-slate-600 mt-0.5 block">
                Consolidates items, categories, campus zones, and reporting users for search and report generation.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
