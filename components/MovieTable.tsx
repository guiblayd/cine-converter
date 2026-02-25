
import React from 'react';
import { Movie } from '../types';

interface Props {
  movies: Movie[];
  onRemove: (index: number) => void;
}

export const MovieTable: React.FC<Props> = ({ movies, onRemove }) => {
  return (
    <div className="flex-grow overflow-x-auto overflow-y-auto custom-scroll w-full h-full min-h-0">
      <table className="w-full text-left border-collapse table-fixed min-w-[500px] sm:min-w-0">
        <thead className="sticky top-0 bg-[#1a1d21] text-[#454d55] uppercase text-[9px] font-black tracking-widest z-10 border-b border-white/5">
          <tr>
            <th className="px-4 sm:px-8 py-4 w-[45%]">Título</th>
            <th className="px-2 sm:px-4 py-4 w-[12%]">Nota</th>
            <th className="px-4 sm:px-8 py-4 w-[33%]">Review / Comentário</th>
            <th className="px-4 sm:px-8 py-4 w-[10%] text-right">#</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {movies.map((movie, idx) => {
            let ratingValue = String(movie.rating || '').trim();
            let displayRating = '—';
            if (ratingValue && ratingValue !== 'undefined' && ratingValue !== 'null') {
                displayRating = ratingValue.includes('/') ? ratingValue : `${ratingValue}/10`;
            }

            return (
              <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                <td className="px-4 sm:px-8 py-4 truncate">
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-[11px] md:text-[12px] italic tracking-tight truncate">{movie.title}</span>
                    <span className="text-[#454d55] text-[9px] font-mono">{movie.year || '—'}</span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-4">
                  <span className={`font-black text-[10px] md:text-[11px] ${displayRating === '—' ? 'text-[#2c3440]' : 'text-[#3d7a74]'}`}>
                    {displayRating}
                  </span>
                </td>
                <td className="px-4 sm:px-8 py-4">
                    <span className="text-[10px] text-[#8a949e] italic truncate block max-w-full opacity-60 group-hover:opacity-100 transition-opacity">
                        {movie.comment ? `"${movie.comment}"` : '—'}
                    </span>
                </td>
                <td className="px-4 sm:px-8 py-4 text-right">
                  <button onClick={() => onRemove(idx)} className="text-[#2c3440] hover:text-red-500 transition-colors text-[10px] font-black uppercase">⨯</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {movies.length === 0 && (
        <div className="py-24 text-center text-[#454d55] text-[11px] italic font-black uppercase tracking-[0.2em]">Nenhum item detectado para processamento.</div>
      )}
    </div>
  );
};
