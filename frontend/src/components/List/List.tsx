import React from 'react';

interface ListProps {
  headers?: React.ReactNode[];
  items: React.ReactNode[][];
}

const List: React.FC<ListProps> = ({ headers, items }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 bg-white rounded">
        {headers && (
          <thead>
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3 py-2 bg-gray-100 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {items.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3 py-2 border-b text-xs text-gray-800 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default List;
