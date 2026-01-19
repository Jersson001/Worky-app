import React, { useState, useEffect, useRef } from 'react';
import { Contact, Story } from '../types';

interface StatusViewProps {
  contacts: Contact[];
  myStories: Story[];
  contactStories: Story[];
  onClose: () => void;
  onAddStory: (content: string, type: 'text' | 'image' | 'video', durationHours: number, color?: string) => void;
  startInCamera?: boolean;
}

export const StatusView: React.FC<StatusViewProps> = ({ contacts, myStories, contactStories, onClose, onAddStory, startInCamera = false }) => {
  const [view, setView] = useState<'list' | 'create' | 'view'>(startInCamera ? 'create' : 'list');
  const [activeStoryGroup, setActiveStoryGroup] = useState<{ contactId: string, stories: Story[] } | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Creation State
  const [newStoryType, setNewStoryType] = useState<'text' | 'image' | 'video'>(startInCamera ? 'image' : 'text');
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryColor, setNewStoryColor] = useState('#00a884');
  const [newStoryDuration, setNewStoryDuration] = useState<number>(24);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const colors = ['#00a884', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#ef4444', '#202c33'];
  const durations = [
      { label: '1 Hora', val: 1 },
      { label: '12 Horas', val: 12 },
      { label: '24 Horas', val: 24 },
      { label: '3 Días', val: 72 },
      { label: '1 Semana', val: 168 },
  ];

  // Handle multiple photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imagePromises: Promise<string>[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          imagePromises.push(
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            })
          );
        }
      }
      
      Promise.all(imagePromises).then((images) => {
        setSelectedImages(images);
        if (images.length > 0) {
          setNewStoryContent(images[0]);
        }
      });
    }
  };

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStoryContent(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Group stories by contact
  const groupedStories = contactStories.reduce((acc, story) => {
    // Filter out expired stories
    if (new Date(story.expiresAt) > new Date()) {
        if (!acc[story.contactId]) acc[story.contactId] = [];
        acc[story.contactId].push(story);
    }
    return acc;
  }, {} as Record<string, Story[]>);

  // --- VIEWER LOGIC ---
  useEffect(() => {
    let timer: any;
    if (view === 'view' && activeStoryGroup) {
      const duration = 5000; // 5 seconds per story
      timer = setTimeout(() => {
        handleNextStory();
      }, duration);
    }
    return () => clearTimeout(timer);
  }, [view, activeStoryGroup, currentStoryIndex]);

  const handleNextStory = () => {
      if (!activeStoryGroup) return;
      if (currentStoryIndex < activeStoryGroup.stories.length - 1) {
          setCurrentStoryIndex(prev => prev + 1);
      } else {
          setView('list'); // Close when done
          setActiveStoryGroup(null);
          setCurrentStoryIndex(0);
      }
  };

  const handlePrevStory = () => {
      if (currentStoryIndex > 0) {
          setCurrentStoryIndex(prev => prev - 1);
      } else {
          // Restart current or close? Let's just restart
          setCurrentStoryIndex(0);
      }
  };

  const handleCreateSubmit = () => {
      if (newStoryType === 'image' && selectedImages.length > 0) {
          // Crear múltiples stories para cada imagen
          selectedImages.forEach((image) => {
              onAddStory(image, 'image', newStoryDuration);
          });
          setSelectedImages([]);
          setNewStoryContent('');
          setView('list');
      } else if (newStoryContent.trim()) {
          onAddStory(newStoryContent, newStoryType, newStoryDuration, newStoryType === 'text' ? newStoryColor : undefined);
          setNewStoryContent('');
          setView('list');
      }
  };

  const getContactName = (id: string) => {
      if (id === 'me') return 'Mi Estado';
      const c = contacts.find(contact => contact.id === id);
      return c ? c.clientName : 'Desconocido';
  };

  const getContactAvatar = (id: string) => {
      const c = contacts.find(contact => contact.id === id);
      return c ? c.avatar : 'https://ui-avatars.com/api/?name=User';
  };

  // --- RENDERERS ---

  const renderList = () => (
      <div className="flex-1 flex flex-col bg-[#111b21] h-full text-[#e9edef] animate-fade-in relative">
          {/* Header */}
          <div className="h-28 bg-[#202c33] px-4 pt-12 pb-4 flex items-center justify-between shadow-md z-10">
             <div className="flex items-center gap-4">
                 <button onClick={onClose} className="text-[#d1d7db] hover:text-white">
                    <i className="fa-solid fa-arrow-left text-xl"></i>
                 </button>
                 <h2 className="text-xl font-medium">Estados</h2>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {/* My Status */}
              <div className="flex items-center gap-4 py-4 cursor-pointer hover:bg-[#202c33] rounded px-2 relative">
                 <div className="relative">
                     <img 
                        src="https://ui-avatars.com/api/?name=Admin&background=00a884&color=fff" 
                        className={`w-12 h-12 rounded-full object-cover border-2 ${myStories.length > 0 ? 'border-[#00a884]' : 'border-gray-500'}`}
                        onClick={() => {
                            if (myStories.length > 0) {
                                setActiveStoryGroup({ contactId: 'me', stories: myStories });
                                setView('view');
                            } else {
                                setView('create');
                            }
                        }}
                     />
                     {myStories.length === 0 && (
                         <div className="absolute bottom-0 right-0 bg-[#00a884] w-5 h-5 rounded-full flex items-center justify-center border border-[#111b21]">
                             <i className="fa-solid fa-plus text-xs text-white"></i>
                         </div>
                     )}
                 </div>
                 <div className="flex-1" onClick={() => setView('create')}>
                     <h3 className="font-medium">Mi estado</h3>
                     <p className="text-sm text-[#8696a0]">
                         {myStories.length > 0 ? 'Toca para ver tus actualizaciones' : 'Toca para añadir actualización'}
                     </p>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => { setNewStoryType('text'); setView('create'); }} className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center text-[#8696a0] hover:text-[#e9edef]">
                        <i className="fa-solid fa-pen"></i>
                     </button>
                     <button onClick={() => { setNewStoryType('image'); setView('create'); }} className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center text-[#8696a0] hover:text-[#e9edef]">
                        <i className="fa-solid fa-camera"></i>
                     </button>
                     <button onClick={() => { setNewStoryType('video'); setView('create'); }} className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center text-[#8696a0] hover:text-[#e9edef]">
                        <i className="fa-solid fa-video"></i>
                     </button>
                 </div>
              </div>

              <div className="h-px bg-[#202c33] my-2"></div>
              
              <h4 className="text-[#8696a0] text-sm font-medium mt-4 mb-4 uppercase">Recientes</h4>

              {Object.keys(groupedStories).length === 0 && (
                  <p className="text-[#8696a0] text-sm italic">No hay actualizaciones recientes de tus contactos.</p>
              )}

              {Object.entries(groupedStories).map(([contactId, stories]: [string, Story[]]) => (
                  <div 
                    key={contactId} 
                    className="flex items-center gap-4 py-3 cursor-pointer hover:bg-[#202c33] rounded px-2"
                    onClick={() => {
                        setActiveStoryGroup({ contactId, stories });
                        setCurrentStoryIndex(0);
                        setView('view');
                    }}
                  >
                      <div className="p-[2px] rounded-full border-2 border-[#00a884]">
                          <img src={getContactAvatar(contactId)} className="w-12 h-12 rounded-full object-cover" />
                      </div>
                      <div>
                          <h3 className="font-medium">{getContactName(contactId)}</h3>
                          <p className="text-sm text-[#8696a0]">
                              {new Date(stories[stories.length-1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderCreate = () => (
      <div 
        className="flex-1 flex flex-col h-full animate-scale-in"
        style={{ backgroundColor: newStoryType === 'text' ? newStoryColor : '#0b141a' }}
      >
          {/* Header */}
          <div className="h-16 px-4 flex items-center justify-between absolute top-0 w-full z-10 bg-gradient-to-b from-black/40 to-transparent">
             <button onClick={() => setView('list')} className="text-white drop-shadow-md">
                <i className="fa-solid fa-xmark text-2xl"></i>
             </button>
             <div className="flex gap-4">
                 <button onClick={() => setNewStoryType('text')} className={`text-2xl drop-shadow-md ${newStoryType === 'text' ? 'text-white' : 'text-white/50'}`}>
                    <i className="fa-solid fa-font"></i>
                 </button>
                 <button onClick={() => setNewStoryType('image')} className={`text-2xl drop-shadow-md ${newStoryType === 'image' ? 'text-white' : 'text-white/50'}`}>
                    <i className="fa-solid fa-image"></i>
                 </button>
                 <button onClick={() => setNewStoryType('video')} className={`text-2xl drop-shadow-md ${newStoryType === 'video' ? 'text-white' : 'text-white/50'}`}>
                    <i className="fa-solid fa-video"></i>
                 </button>
             </div>
          </div>

          {/* Content Input */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
              {newStoryType === 'text' ? (
                  <textarea 
                     value={newStoryContent}
                     onChange={(e) => setNewStoryContent(e.target.value)}
                     placeholder="Escribe un estado..."
                     className="w-full h-64 bg-transparent text-white text-3xl text-center placeholder-white/50 outline-none resize-none font-medium drop-shadow-sm"
                     autoFocus
                  />
              ) : newStoryType === 'image' ? (
                  <div className="w-full max-w-md flex flex-col gap-4">
                      {selectedImages.length > 0 ? (
                          <div className="flex flex-col gap-3">
                              <div className="bg-[#202c33] p-4 rounded-lg flex items-center justify-center min-h-[300px] border border-gray-700">
                                  <img src={selectedImages[0]} className="max-h-full max-w-full rounded" />
                              </div>
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                  {selectedImages.map((img, idx) => (
                                      <div key={idx} className="relative flex-shrink-0">
                                          <img 
                                              src={img} 
                                              className={`w-16 h-16 rounded object-cover cursor-pointer border-2 ${selectedImages[0] === img ? 'border-[#00a884]' : 'border-gray-600'}`}
                                              onClick={() => setNewStoryContent(img)}
                                          />
                                          <button
                                              onClick={() => {
                                                  const newImages = selectedImages.filter((_, i) => i !== idx);
                                                  setSelectedImages(newImages);
                                                  if (newImages.length > 0) {
                                                      setNewStoryContent(newImages[0]);
                                                  } else {
                                                      setNewStoryContent('');
                                                  }
                                              }}
                                              className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                          >
                                              <i className="fa-solid fa-xmark"></i>
                                          </button>
                                      </div>
                                  ))}
                              </div>
                              <p className="text-white/70 text-sm text-center">
                                  {selectedImages.length} {selectedImages.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
                              </p>
                          </div>
                      ) : (
                          <div className="bg-[#202c33] p-4 rounded-lg flex items-center justify-center min-h-[300px] border border-gray-700">
                              <div className="text-gray-500 flex flex-col items-center">
                                  <i className="fa-regular fa-image text-4xl mb-2"></i>
                                  <p>Selecciona una o varias fotos</p>
                              </div>
                          </div>
                      )}
                      <input 
                         type="file"
                         ref={fileInputRef}
                         accept="image/*"
                         multiple
                         onChange={handlePhotoUpload}
                         className="hidden"
                      />
                      <div className="flex gap-2">
                          <button 
                             onClick={() => fileInputRef.current?.click()}
                             className="flex-1 bg-[#202c33] text-white py-3 rounded-lg font-medium hover:bg-[#2a3942] transition flex items-center justify-center gap-2 border border-gray-600"
                          >
                             <i className="fa-solid fa-camera"></i>
                             {selectedImages.length > 0 ? 'Agregar Más' : 'Subir Fotos'}
                          </button>
                          {selectedImages.length > 0 && (
                              <button 
                                 onClick={handleCreateSubmit}
                                 className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f6f] transition flex items-center justify-center gap-2"
                              >
                                 <i className="fa-solid fa-paper-plane"></i>
                                 Enviar Estado
                              </button>
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="w-full max-w-md flex flex-col gap-4">
                      <div className="bg-[#202c33] p-4 rounded-lg flex items-center justify-center min-h-[300px] border border-gray-700">
                          {newStoryContent ? (
                              <video src={newStoryContent} controls className="max-h-full max-w-full rounded" />
                          ) : (
                              <div className="text-gray-500 flex flex-col items-center">
                                  <i className="fa-solid fa-video text-4xl mb-2"></i>
                                  <p>Selecciona un video</p>
                              </div>
                          )}
                      </div>
                      <input 
                         type="file"
                         ref={videoInputRef}
                         accept="video/*"
                         onChange={handleVideoUpload}
                         className="hidden"
                      />
                      <button 
                         onClick={() => videoInputRef.current?.click()}
                         className="bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f6f] transition flex items-center justify-center gap-2"
                      >
                         <i className="fa-solid fa-video"></i>
                         Subir Video
                      </button>
                  </div>
              )}
          </div>

          {/* Toolbar */}
          <div className="bg-[#0b141a]/60 backdrop-blur-md p-4 pb-8 flex flex-col gap-4 z-10">
              
              {/* Duration Selector */}
              <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/70 uppercase font-bold ml-1">Duración de la publicación</label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {durations.map(d => (
                          <button
                            key={d.val}
                            onClick={() => setNewStoryDuration(d.val)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${newStoryDuration === d.val ? 'bg-[#00a884] border-[#00a884] text-black' : 'bg-transparent border-white/30 text-white hover:bg-white/10'}`}
                          >
                              {d.label}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Color Picker (Only Text) */}
              {newStoryType === 'text' && (
                  <div className="flex gap-3 justify-center">
                      {colors.map(c => (
                          <button 
                             key={c}
                             onClick={() => setNewStoryColor(c)}
                             className={`w-8 h-8 rounded-full border-2 ${newStoryColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                             style={{ backgroundColor: c }}
                          />
                      ))}
                  </div>
              )}

              {/* Send Button */}
              {newStoryType !== 'image' && (
                  <div className="flex justify-end">
                      <button 
                         onClick={handleCreateSubmit}
                         disabled={!newStoryContent}
                         className="bg-[#00a884] text-white w-14 h-14 rounded-full shadow-lg hover:bg-[#008f6f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition transform active:scale-95"
                      >
                          <i className="fa-solid fa-paper-plane text-xl"></i>
                      </button>
                  </div>
              )}
          </div>
      </div>
  );

  const renderView = () => {
      if (!activeStoryGroup) return null;
      const currentStory = activeStoryGroup.stories[currentStoryIndex];

      return (
          <div className="absolute inset-0 bg-black flex flex-col z-50">
              {/* Progress Bars */}
              <div className="flex gap-1 p-2 pt-4 z-20">
                  {activeStoryGroup.stories.map((s, idx) => (
                      <div key={s.id} className="h-1 bg-white/30 flex-1 rounded overflow-hidden">
                          <div 
                            className={`h-full bg-white transition-all duration-[5000ms] linear ${idx === currentStoryIndex ? 'w-full' : idx < currentStoryIndex ? 'w-full duration-0' : 'w-0'}`}
                          ></div>
                      </div>
                  ))}
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 px-4 py-2 z-20 text-white">
                  <button onClick={() => { setView('list'); setActiveStoryGroup(null); }} className="mr-1">
                      <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <img src={getContactAvatar(activeStoryGroup.contactId)} className="w-10 h-10 rounded-full border border-white/20" />
                  <div className="flex flex-col">
                      <span className="font-medium text-sm text-shadow">{getContactName(activeStoryGroup.contactId)}</span>
                      <span className="text-xs text-white/70">
                          {new Date(currentStory.timestamp).toLocaleString()} • Expira en {Math.round((new Date(currentStory.expiresAt).getTime() - Date.now()) / 3600000)}h
                      </span>
                  </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                   {/* Tap Zones */}
                   <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrevStory}></div>
                   <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNextStory}></div>

                   {currentStory.type === 'text' ? (
                       <div 
                         className="w-full h-full flex items-center justify-center p-8 text-center"
                         style={{ backgroundColor: currentStory.color || '#202c33' }}
                       >
                           <p className="text-white text-2xl md:text-4xl font-medium drop-shadow-md leading-relaxed">
                               {currentStory.content}
                           </p>
                       </div>
                   ) : currentStory.type === 'video' ? (
                       <div className="w-full h-full bg-black flex items-center justify-center">
                           <video src={currentStory.content} controls autoPlay className="max-h-full max-w-full" />
                       </div>
                   ) : (
                       <div className="w-full h-full bg-black flex items-center justify-center">
                           <img src={currentStory.content} className="max-h-full max-w-full object-contain" />
                       </div>
                   )}
              </div>
          </div>
      );
  };

  return (
    <div className="absolute inset-0 bg-[#111b21] z-50 flex flex-col">
        {view === 'list' && renderList()}
        {view === 'create' && renderCreate()}
        {view === 'view' && renderView()}
    </div>
  );
};