import React, { useState, useRef } from 'react';
import { FAMILIAS, tiposDe } from '../utils/tiposDeNegocio';
import { UserProfileData } from '../types';
import { EMPRESA, URL_PRIVACIDAD, URL_TERMINOS, avisoDerechos } from '../utils/legal';

interface ProfileEditorProps {
  userProfile: UserProfileData;
  onSave: (userData: UserProfileData) => void;
  onClose: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ userProfile, onSave, onClose }) => {
  const [businessName, setBusinessName] = useState(userProfile.businessName || '');
  const [ownerName, setOwnerName] = useState(userProfile.ownerName || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [businessType, setBusinessType] = useState(userProfile.businessType || '');
  const [businessLogo, setBusinessLogo] = useState(userProfile.businessLogo || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [nit, setNit] = useState(userProfile.nit || '');
  const [address, setAddress] = useState(userProfile.address || '');
  const [city, setCity] = useState(userProfile.city || '');
  const [country, setCountry] = useState(userProfile.country || 'Colombia');
  const [profilePhoto, setProfilePhoto] = useState(userProfile.profilePhoto || '');
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaving(true);
    const updatedProfile: UserProfileData = {
      ...userProfile,
      businessName,
      ownerName,
      phone,
      businessType,
      businessLogo,
      email,
      nit,
      address,
      city,
      country,
      profilePhoto
    };
    
    onSave(updatedProfile);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <div>
                <h2 className="text-2xl font-bold">Editar Perfil</h2>
                <p className="text-white/80 text-sm">Actualiza tu información personal y de negocio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border-4 border-white shadow-xl overflow-hidden">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-400">
                    <i className="fa-solid fa-user text-5xl"></i>
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition"
              >
                <i className="fa-solid fa-camera"></i>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoUpload}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">Toca para cambiar tu foto</p>
          </div>

          {/* Sección: Información Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-user text-indigo-600"></i>
              Información Personal
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                placeholder="+57 300 123 4567"
              />
            </div>
          </div>

          {/* Sección: Información del Negocio */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-briefcase text-indigo-600"></i>
              Información del Negocio
            </h3>

            {/* Logo del negocio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Logo del Negocio</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                  {businessLogo ? (
                    <img src={businessLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <i className="fa-solid fa-image text-2xl text-slate-400"></i>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition"
                  >
                    <i className="fa-solid fa-upload mr-2"></i>
                    {businessLogo ? 'Cambiar Logo' : 'Subir Logo'}
                  </button>
                  {businessLogo && (
                    <button
                      onClick={() => setBusinessLogo('')}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
                    >
                      <i className="fa-solid fa-trash mr-2"></i>
                      Eliminar
                    </button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Negocio</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                placeholder="Ej: Carpintería El Roble"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Negocio</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
              >
                <option value="">Selecciona una opción</option>
                {FAMILIAS.map(f => {
                  const tipos = tiposDe(f.key);
                  if (!tipos.length) return null;
                  const opciones = tipos.map(t => (
                    <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                  ));
                  // «Otro» no necesita encabezado: va suelto al final.
                  return f.label
                    ? <optgroup key={f.key} label={f.label}>{opciones}</optgroup>
                    : <React.Fragment key={f.key}>{opciones}</React.Fragment>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIT / RUT / Cédula</label>
              <input
                type="text"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                placeholder="900.123.456-7"
              />
            </div>
          </div>

          {/* Sección: Ubicación */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-location-dot text-indigo-600"></i>
              Ubicación
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                placeholder="Calle 123 # 45-67"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                  placeholder="Bogotá"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-slate-900 font-medium placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-600 read-only:bg-slate-100 read-only:text-slate-600"
                  placeholder="Colombia"
                />
              </div>
            </div>
          </div>

          {/* Sección: Legal
              Quién responde por la aplicación y dónde están sus documentos.
              Play pide la política a la vista, y la Ley 1581 que el titular
              pueda llegar a ella y ejercer sus derechos sin buscarla. */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-indigo-600"></i>
              Legal
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={URL_PRIVACIDAD}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-white transition"
              >
                <i className="fa-solid fa-user-shield text-indigo-600"></i>
                <span className="text-sm font-semibold text-slate-700">Política de Datos</span>
              </a>
              <a
                href={URL_TERMINOS}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-white transition"
              >
                <i className="fa-solid fa-file-contract text-indigo-600"></i>
                <span className="text-sm font-semibold text-slate-700">Términos</span>
              </a>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Responsable</p>
              <p className="text-sm font-bold text-slate-800">{EMPRESA.razonSocial}</p>
              <p className="text-xs text-slate-600">NIT {EMPRESA.nit}</p>
              <p className="text-xs text-slate-600">{EMPRESA.direccion}</p>
              <p className="text-xs text-slate-600">{EMPRESA.ciudad}</p>
              <a
                href={`mailto:${EMPRESA.correo}`}
                className="text-xs text-indigo-600 font-semibold hover:underline inline-block pt-1"
              >
                {EMPRESA.correo}
              </a>
            </div>

            {/* Play exige que una aplicación con cuentas diga cómo se borran.
                Va por correo, que es lo que promete la política. */}
            <a
              href={`mailto:${EMPRESA.correo}?subject=${encodeURIComponent('Solicitud de eliminación de cuenta y datos')}&body=${encodeURIComponent('Solicito la eliminación de mi cuenta de Worky y de mis datos personales.\n\nNombre:\nDocumento:\nCorreo de la cuenta:\n')}`}
              className="flex items-center justify-center gap-2 w-full p-3 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition"
            >
              <i className="fa-solid fa-trash-can text-xs"></i>
              Solicitar eliminación de mi cuenta y datos
            </a>

            <p className="text-[11px] text-slate-400 text-center pt-1">
              {avisoDerechos()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                Guardando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
