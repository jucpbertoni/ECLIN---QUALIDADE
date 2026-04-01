
import React from 'react';
import { MuralPost } from '../types';

interface MuralCarouselProps {
  posts: MuralPost[];
  onSelectPost: (post: MuralPost) => void;
  onEditPost?: (post: MuralPost) => void;
  isAdmin?: boolean;
}

const MuralCarousel: React.FC<MuralCarouselProps> = ({ posts, onSelectPost, onEditPost, isAdmin }) => {
  // Pegamos os 3 posts mais recentes para exibição em destaque
  const latestPosts = posts.slice(0, 3);

  if (latestPosts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-700">
      {latestPosts.map((post) => (
        <div 
          key={post.id}
          className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
        >
          {/* Imagem do Post */}
          <div className="aspect-video overflow-hidden bg-slate-100 relative">
            <img
              src={post.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800'}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-brand-secondary text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm">
                {post.date}
              </span>
            </div>
          </div>

          {/* Conteúdo do Post */}
          <div className="p-6 flex flex-col flex-1">
            <h3 className="text-base font-black text-brand-dark mb-3 leading-tight uppercase line-clamp-2 min-h-[2.5rem]">
              {post.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-6 flex-1">
              {post.content}
            </p>
            
            <div className="flex gap-2 pt-4 border-t border-slate-50">
              <button 
                onClick={() => onSelectPost(post)}
                className="flex-1 bg-brand-primary text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all shadow-sm"
              >
                Ler Publicação
              </button>
              {isAdmin && onEditPost && (
                <button 
                  onClick={() => onEditPost(post)}
                  className="px-3 bg-slate-50 text-slate-400 rounded-xl hover:text-brand-primary transition-colors border border-slate-100"
                  title="Editar Post"
                >
                  <i className="fas fa-edit text-xs"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MuralCarousel;
