
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
  const [isPaused, setIsPaused] = useState(false);
  
  // Get the 3 most recent posts
  const latestPosts = posts.slice(0, 3);

  useEffect(() => {
    if (latestPosts.length <= 1 || isPaused) return;
    
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % latestPosts.length);
    }, 8000); // Slower transition for better readability
    
    return () => clearInterval(timer);
  }, [latestPosts.length, isPaused]);

  // Ensure current index is valid if posts change
  useEffect(() => {
    if (current >= latestPosts.length && latestPosts.length > 0) {
      setCurrent(0);
    }
  }, [latestPosts.length, current]);

  if (latestPosts.length === 0) return null;

  const nextSlide = () => setCurrent((prev) => (prev + 1) % latestPosts.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + latestPosts.length) % latestPosts.length);

  return (
    <div 
      className="relative w-full overflow-hidden rounded-[3rem] shadow-2xl group border-8 border-white bg-white min-h-[500px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {latestPosts.map((post, index) => (
        <div
          key={post.id}
          className={`flex flex-col md:flex-row transition-all duration-1000 ease-in-out ${
            index === current ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-10 absolute inset-0 pointer-events-none'
          }`}
        >
          {/* Image Section - 9:16 Aspect Ratio */}
          <div className="w-full md:w-2/5 lg:w-1/3 aspect-[9/16] overflow-hidden">
            <img
              src={post.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200'}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Text Content Section - External to Image */}
          <div className="flex-1 flex flex-col justify-center p-8 md:p-16 lg:p-20 bg-white">
            <div className="flex items-center gap-4 mb-6 animate-in slide-in-from-right-10 duration-700">
              <span className="w-12 h-[3px] bg-brand-secondary rounded-full"></span>
              <span className="text-xs font-black text-brand-secondary uppercase tracking-[0.5em]">{post.date}</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-6 text-brand-dark leading-[1.1] tracking-tighter uppercase animate-in slide-in-from-right-10 duration-1000">
              {post.title}
            </h2>
            
            <p className="text-base md:text-lg text-slate-600 font-medium max-w-2xl line-clamp-6 mb-10 animate-in slide-in-from-right-10 duration-1200">
              {post.content}
            </p>
            
            <div className="flex gap-4 animate-in zoom-in-50 duration-1500">
              <button 
                onClick={() => onSelectPost(post)}
                className="w-fit brand-gradient text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-105 transition-all shadow-xl shadow-brand-primary/30"
              >
                Ver Publicação Completa
              </button>
              {isAdmin && onEditPost && (
                <button 
                  onClick={() => onEditPost(post)}
                  className="w-fit bg-slate-100 text-slate-800 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-200 transition-all border border-slate-200"
                >
                  Editar Post
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Navigation Controls */}
      {latestPosts.length > 1 && (
        <>
          <div className="absolute top-1/2 -translate-y-1/2 left-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={prevSlide}
              className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-brand-dark shadow-lg hover:bg-brand-primary hover:text-white transition-all"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={nextSlide}
              className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-brand-dark shadow-lg hover:bg-brand-primary hover:text-white transition-all"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="absolute bottom-10 right-10 flex gap-4 z-30 bg-slate-100/80 backdrop-blur-xl px-6 py-3 rounded-full border border-slate-200 shadow-lg">
            {latestPosts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === current ? 'bg-brand-secondary w-12' : 'bg-slate-300 hover:bg-slate-400 w-2'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MuralCarousel;
