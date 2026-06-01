import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../utils/LanguageProvider.jsx';

const SignUp = () => {
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const registerForm = useRef(null);
  const { user, registerUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const rules = [
    { label: t("At least 8 characters"), test: /.{8,}/ },
    { label: t("At least one lowercase letter"), test: /[a-z]/ },
    { label: t("At least one uppercase letter"), test: /[A-Z]/ },
    { label: t("At least one number"), test: /\d/ },
    { label: t("At least one special character (!...$)"), test: /[!@#$%^&*(),.?":{}|<>_-]/ }
  ];

  const allRulesPass = rules.every(rule => rule.test.test(password));
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = registerForm.current.email.value;
    const name = registerForm.current.name.value;
    const password1 = registerForm.current.password1.value;
    const password2 = registerForm.current.password2.value;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t("Please enter a valid email address."));
      return;
    }

    if (!allRulesPass) {
      toast.error(t('Password does not meet all requirements.'));
      return;
    }


    if (password1 !== password2) {
      toast.error(t('Passwords do not match!'));
      return
    }

    const userInfo = { name, email, password1};
    try {
      await registerUser(userInfo);
      // Optionally navigate here if not handled in registerUser
    } catch (error) {
      alert(t('Registration failed. Please try again.'));
      console.error(error);
    }
  };

  useEffect(() => {
    if(user) {
      navigate('/');
    }
  }, [navigate, user])

  return (
    <div className="flex justify-center items-center bg-gray-50 px-4 min-h-screen">
      <div className="bg-white shadow-md p-8 rounded-lg w-full max-w-md">
        <div className='flex justify-center'>
          <h1 className='mb-7 font-bold text-3xl'>
            {t('clubTitle')}
          </h1>
        </div>
        
        <h2 className="mb-1 font-bold text-gray-800 text-2xl">{t('Create an account')}</h2>
        <p className="mb-6 text-gray-500 text-sm">{t('Please fill in your details')}</p>

        <form onSubmit={handleSubmit} ref={registerForm}>

          <input
            type="text"
            name="name"
            placeholder={t('name')}
            className="mb-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            required
          />

          <input
            type="email"
            name="email"
            placeholder={t('Email address')}
            className="mb-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            required
          />

          <div className="relative mb-4">
            <input
              type={showPassword1 ? "text" : "password"}
              name="password1"
              placeholder={t('Password')}
              onChange={(e) => setPassword(e.target.value)}          
              className="mb-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              required
            />
            <span
              onClick={() => setShowPassword1(!showPassword1)}
              className="top-[0.8rem] right-3 absolute flex items-center text-gray-500 cursor-pointer"
            >
              {showPassword1 ? <Eye size={15}/> : <EyeOff size={15}/>}
            </span>
            {/* Password Rules */}
            <ul className="space-y-1 mb-2 text-sm">
              {rules.map((rule, index) => {
                const isValid = rule.test.test(password);
                return (
                  <li
                    key={index}
                    className={isValid ? "text-green-600" : "text-red-500"}
                  >
                    {isValid ? "✓" : "✗"} {rule.label}
                  </li>
                );
              })}
            </ul>

            <input
              type={showPassword2 ? "text" : "password"}
              name="password2"
              placeholder={t('Confirm Password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mb-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              required
            />
            <span
              onClick={() => setShowPassword2(!showPassword2)}
              className="top-[11.7rem] right-3 absolute flex items-center text-gray-500 cursor-pointer"
            >
              {showPassword2 ? <Eye size={15}/> : <EyeOff size={15}/>}
            </span>
          </div>
          

          <button
            type="submit"
            value="Register"
            className={`mb-4 py-2 rounded-md w-full text-white transition 
              ${allRulesPass && passwordsMatch
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"}`
              }
          >
            {t('Sign up')}
          </button>
        </form>

        {/* <button
          className="flex justify-center items-center gap-2 mb-4 py-2 border rounded-md w-full"
          onClick={() => alert('Google sign-up not implemented')}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Sign up with Google
        </button> */}

        <p className="text-sm text-center">
          {t('Already have an account?')}{' '}
          <Link to="/sign-in" className="text-blue-600 hover:underline">
            {t('Sign in')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
