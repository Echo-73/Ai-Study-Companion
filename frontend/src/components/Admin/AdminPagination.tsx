import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
}

export const AdminPagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalRecords === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem 0.5rem',
        marginTop: '1rem',
        borderTop: '1px solid var(--border-glass)',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>
          Showing <strong>{(page - 1) * pageSize + 1}</strong> to{' '}
          <strong>{Math.min(page * pageSize, totalRecords)}</strong> of{' '}
          <strong>{totalRecords}</strong> records
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="input-glass"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.85rem',
                width: 'auto',
                cursor: 'pointer',
              }}
            >
              <option value={10} style={{ background: '#121826' }}>10</option>
              <option value={25} style={{ background: '#121826' }}>25</option>
              <option value={50} style={{ background: '#121826' }}>50</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-secondary"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            opacity: page <= 1 ? 0.4 : 1,
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <span style={{ padding: '0 0.5rem', fontWeight: 600 }}>
          Page {page} of {Math.max(totalPages, 1)}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-secondary"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            opacity: page >= totalPages ? 0.4 : 1,
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
