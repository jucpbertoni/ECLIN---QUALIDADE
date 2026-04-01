
import React, { useState, useEffect } from 'react';
import { MuralPost } from '../types';

interface MuralCarouselProps {
  posts: MuralPost[];
  onSelectPost: (post: MuralPost) => void;
  onEditPost?: (post: MuralPost) => void;
  isAdmin?: boolean;
}

const MuralCarousel: React.FC<MuralCarouselProps> = ({ posts, onSelectPost, onEditPost, isAdmin }) => {
  const [current, setCurrent] = useState(0);
  
  // Get the 3 most recent posts
  const latestPosts = posts.slice(0, 3);

  // Simple timer that only runs if we have more than 1 post
  useEffect(() => {
    if (latestPosts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % latestPosts.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [latestPosts.length]);

  if (latestPosts.length === 0) return null;

  // Ensure we always have a valid post even if current is out of sync
  const safeIndex = current % latestPosts.length;
  const post = latestPosts[safeIndex];

  return (
    <div className="relative w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200">
      <div className="flex flex-col md:flex-row min-h-[450px]">
        {/* Image Section */}
        <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-slate-100">
          <img
            key={post.id} // Force re-render of image on post change
            src={post.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200'}
            alt={post.title}
            className="w-full h-full object-cover transition-opacity duration-500"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content Section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-4">
            <span className="text-[10px] font-black text-brand-secondary uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
              {post.date}
            </span>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-black text-brand-dark mb-4 leading-tight uppercase tracking-tighter">
            {post.title}
          </h2>
          
          <p className="text-slate-600 mb-8 line-clamp-4 font-medium text-sm md:text-base">
            {post.content}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => onSelectPost(post)}
              className="bg-brand-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-dark transition-colors shadow-lg"
            >
              Ver Publicação
            </button>
            {isAdmin && onEditPost && (
              <button 
                onClick={() => onEditPost(post)}
                className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors border border-slate-200"
              >
                Editar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      {latestPosts.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {latestPosts.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === safeIndex ? 'bg-brand-primary w-8' : 'bg-slate-300 w-2'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MuralCarousel;
