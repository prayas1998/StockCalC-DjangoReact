import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; // This should match your supabase client path

const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Verifying your account...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // This will process the auth tokens in the URL
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setMessage('There was a problem verifying your account. Please try again.');
          return;
        }
        
        if (data.session) {
          // Redirect to your app's home page or dashboard
          navigate('/');
        } else {
          setMessage('Authentication failed. Please try signing in again.');
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{message}</h2>
        <p>You will be redirected automatically once verification is complete.</p>
      </div>
    </div>
  );
};

export default AuthCallback;