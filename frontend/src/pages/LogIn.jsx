import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../utils/LanguageProvider.jsx';

const LogIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, loginUser } = useAuth();
  const { t } = useLanguage();

  const loginForm = useRef(null);

  useEffect(() => {
    if(user) {
      navigate('/')
    }
  }, [navigate, user])

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = loginForm.current.email.value;
    const password = loginForm.current.password.value;
    
    try {
      await loginUser({email, password});
    } catch {
      alert(t('Please check the email or password.'));
    }
  }

  return (
    <div className="flex justify-center items-center bg-gray-50 px-4 min-h-screen">
      <div className="bg-white shadow-md p-8 rounded-lg w-full max-w-md">
        <div className='flex justify-self-center'>
          <h2 className="mb-7 font-bold text-gray-800 text-3xl">
            {/* {t('clubTitle')} */}KuanMatch
          </h2>
        </div>

        <h2 className="mb-1 font-bold text-gray-800 text-3xl">{t('welcome')}</h2>
        <p className="mb-6 text-gray-500 text-md">{t('Please enter your details')}</p>

        <form
          onSubmit={handleSubmit}
          ref={loginForm}
        >
          <input
            type="email"
            name="email"
            placeholder={t('Email address')}
            className="mb-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            required
          />

          <div className='relative w-full'>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder={t('Password')}
              className="mb-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="top-5 right-3 absolute text-gray-600 -translate-y-1/2 select-none"
            >
              {showPassword ? <Eye size={15}/> : <EyeOff size={15}/>}
            </button>
          </div>
          

          {/* <div className="flex justify-between items-center mb-4">
            <label className="flex items-center text-sm">
              <input type="checkbox" className="mr-2" />
              Remember for 30 days
            </label>
            <a href="#" className="text-blue-500 text-sm hover:underline">
              Forgot password
            </a>
          </div> */}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 mb-4 py-2 rounded-md w-full text-white"
          >
            {t('Sign in')}
          </button>
        </form>

        {/* <button
          className="flex justify-center items-center gap-2 mb-4 py-2 border rounded-md w-full"
          onClick={() => alert('Google sign-in not implemented')}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button> */}

        <p className="text-sm text-center">
          {t("Don't have an account?")}{" "}
          <Link to="/sign-up" className="text-blue-600 hover:underline">
            {t('Sign up')}
          </Link>
        </p>
        <Link
          to="/dashboard"
          className="flex justify-center items-center gap-1.5 mt-5 font-medium text-blue-600 hover:text-blue-700 text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('dashboard')}
        </Link>
      </div>
    </div>
  )
}

export default LogIn
