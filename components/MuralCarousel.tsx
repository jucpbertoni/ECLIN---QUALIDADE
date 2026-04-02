
import React, { useState, memo } from 'react';
import { MuralPost } from '../types';

interface MuralCarouselProps {
  posts: MuralPost[];
  onSelectPost: (post: MuralPost) => void;
  onEditPost?: (post: MuralPost) => void;
  isAdmin?: boolean;
}

const MuralCarousel = memo<MuralCarouselProps>(({ posts, onSelectPost, onEditPost, isAdmin }) => {
  const [page, setPage] = useState(0);
  const postsPerPage = 6; // 2 rows of 3 posts
  
  if (posts.length === 0) return null;

  const totalPages = Math.ceil(posts.length / postsPerPage);
  const currentPosts = posts.slice(page * postsPerPage, (page + 1) * postsPerPage);

  return (
    <div className="space-y-8">
      {/* Grid Simples e Estático */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentPosts.map((post) => (
          <div key={post.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-[400px]">
            <div className="h-44 bg-slate-100">
              <img 
                src={post.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800'} 
                alt="" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <span className="text-[10px] font-bold text-brand-secondary uppercase mb-2">{post.date}</span>
              <h3 className="font-bold text-slate-800 mb-2 line-clamp-2 text-sm uppercase">{post.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-3 mb-4 flex-1 leading-relaxed">{post.content}</p>
              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => onSelectPost(post)}
                  className="flex-1 bg-brand-primary text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-brand-dark transition-colors"
                >
                  Ver Post
                </button>
                {isAdmin && onEditPost && (
                  <button 
                    onClick={() => onEditPost(post)}
                    className="px-3 bg-slate-50 text-slate-400 rounded-xl border border-slate-200 hover:text-brand-primary transition-colors"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Navegação Simples */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4">
          <button 
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 transition-all"
          >
            <i className="fas fa-chevron-left mr-2"></i>
            Anterior
          </button>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Página {page + 1} de {totalPages}
          </span>
          <button 
            disabled={page === totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-6 py-2.5 bg-brand-dark text-white rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 transition-all"
          >
            Próximo
            <i className="fas fa-chevron-right ml-2"></i>
          </button>
        </div>
      )}
    </div>
  );
});

export default MuralCarousel;
