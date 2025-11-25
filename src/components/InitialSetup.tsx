import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export function InitialSetup({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState('Inicializando aplicación...');
  const [error, setError] = useState('');

  useEffect(() => {
    setupApplication();
  }, []);

  const setupApplication = async () => {
    try {
      // Step 1: Check if admin user exists
      setStatus('Verificando usuarios...');
      
      // Try to sign in as admin
      const { error: adminSignInError } = await supabase.auth.signInWithPassword({
        email: 'admin@recetas.com',
        password: 'admin123',
      });

      // If admin doesn't exist, create demo users
      if (adminSignInError) {
        setStatus('Creando usuarios de prueba...');
        
        // Create admin user
        const adminResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: 'admin@recetas.com',
              password: 'admin123',
              name: 'Administrador',
              role: 'admin',
            }),
          }
        );

        if (!adminResponse.ok) {
          console.error('Error creating admin user');
        }
        
        // Create regular user
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: 'usuario@recetas.com',
              password: 'usuario123',
              name: 'Usuario Demo',
              role: 'user',
            }),
          }
        );
      }

      // Step 2: Initialize recipes
      setStatus('Creando recetas de ejemplo...');
      
      // Sign in as admin to initialize recipes
      const { data: adminSession, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@recetas.com',
        password: 'admin123',
      });

      if (!signInError && adminSession?.session?.access_token) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/init-recipes`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminSession.session.access_token}`,
            },
          }
        );
      }

      // Sign out after setup
      await supabase.auth.signOut();

      setStatus('¡Configuración completada!');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Error durante la configuración');
      // Continue anyway after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-gray-900 mb-2">Configuración Inicial</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}