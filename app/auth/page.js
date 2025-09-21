"use client";
import { useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles,
  Shield,
  Zap,
  GraduationCap,
  Users,
  Building,
  Settings,
} from "lucide-react";

const USER_ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  INSTITUTE: "institute",
  ADMIN: "admin",
};

const ROLE_CONFIG = {
  [USER_ROLES.STUDENT]: {
    icon: GraduationCap,
    title: "Student",
    description: "Track your attendance and view academic progress",
    color: "from-blue-500 to-cyan-500",
  },
  [USER_ROLES.TEACHER]: {
    icon: Users,
    title: "Teacher/Faculty",
    description: "Manage classes, take attendance, and monitor students",
    color: "from-green-500 to-emerald-500",
  },
  [USER_ROLES.INSTITUTE]: {
    icon: Building,
    title: "Institute",
    description: "Oversee entire institution and manage departments",
    color: "from-purple-500 to-violet-500",
  },
  [USER_ROLES.ADMIN]: {
    icon: Settings,
    title: "Admin",
    description: "System administration and technical support",
    color: "from-orange-500 to-red-500",
  },
};

export default function PremiumAuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isLogin && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLogin) {
      if (!fullName) {
        newErrors.fullName = "Full name is required";
      }

      if (!selectedRole) {
        newErrors.role = "Please select your role";
      }

      if (selectedRole === USER_ROLES.INSTITUTE && !instituteName) {
        newErrors.instituteName = "Institute name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserProfile = async (user, role) => {
    const userProfile = {
      uid: user.uid,
      email: user.email,
      fullName,
      role,
      createdAt: new Date(),
      emailVerified: user.emailVerified,
      lastLogin: new Date(),
    };

    if (role === USER_ROLES.INSTITUTE) {
      userProfile.instituteName = instituteName;
    }

    await setDoc(doc(db, "users", user.uid), userProfile);
    return userProfile;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // Check if email is verified
        if (!user.emailVerified) {
          router.push("/verify");
          return;
        }

        // Get user profile to check role
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Redirect based on role
          switch (userData.role) {
            case USER_ROLES.STUDENT:
              router.push("/student/dashboard");
              break;
            case USER_ROLES.TEACHER:
              router.push("/teacher/dashboard");
              break;
            case USER_ROLES.INSTITUTE:
              router.push("/institute/dashboard");
              break;
            case USER_ROLES.ADMIN:
              router.push("/admin/dashboard");
              break;
            default:
              router.push("/profile");
          }
        } else {
          router.push("/profile");
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // Create user profile with role
        await createUserProfile(user, selectedRole);

        // Send verification email to new users
        await sendEmailVerification(user);
        router.push("/verify");
      }
    } catch (err) {
      setErrors({
        submit: err.message
          .replace("Firebase: ", "")
          .replace(/\([^)]*\)/g, "")
          .trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user profile exists
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        // New Google user - need to select role
        setErrors({
          submit:
            "Please sign up first to select your role before using Google login.",
        });
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();
      // Redirect based on role
      switch (userData.role) {
        case USER_ROLES.STUDENT:
          router.push("/student/dashboard");
          break;
        case USER_ROLES.TEACHER:
          router.push("/teacher/dashboard");
          break;
        case USER_ROLES.INSTITUTE:
          router.push("/institute/dashboard");
          break;
        case USER_ROLES.ADMIN:
          router.push("/admin/dashboard");
          break;
        default:
          router.push("/profile");
      }
    } catch (err) {
      setErrors({
        submit: err.message
          .replace("Firebase: ", "")
          .replace(/\([^)]*\)/g, "")
          .trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors({ email: "Please enter your email first" });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
    } catch (err) {
      setErrors({ email: err.message });
    }
  };

  return (
    <div className="min-h-screen pt-10 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Auth Form */}
            <div className="order-2 lg:order-1">
              <div className="bg-gray-800/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {isLogin ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="text-gray-300">
                    {isLogin
                      ? "Sign in to your account"
                      : "Join our premium platform"}
                  </p>
                </div>

                {errors.submit && (
                  <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg">
                    <p className="text-red-300 text-sm">{errors.submit}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {!isLogin && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (errors.fullName)
                              setErrors({ ...errors, fullName: "" });
                          }}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-700/50 text-white placeholder-gray-400 ${
                            errors.fullName
                              ? "border-red-500/50"
                              : "border-gray-600"
                          }`}
                        />
                        {errors.fullName && (
                          <p className="text-red-400 text-sm mt-1">
                            {errors.fullName}
                          </p>
                        )}
                      </div>

                      {/* Role Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-3">
                          Select Your Role
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                            const IconComponent = config.icon;
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => {
                                  setSelectedRole(role);
                                  if (errors.role)
                                    setErrors({ ...errors, role: "" });
                                }}
                                className={`p-4 border-2 rounded-xl transition-all duration-200 text-left ${
                                  selectedRole === role
                                    ? `border-indigo-500 bg-indigo-500/20`
                                    : `border-gray-600 hover:border-gray-500 bg-gray-700/30`
                                }`}
                              >
                                <IconComponent
                                  className={`w-6 h-6 mb-2 ${
                                    selectedRole === role
                                      ? "text-indigo-400"
                                      : "text-gray-400"
                                  }`}
                                />
                                <h4 className="font-medium text-white text-sm">
                                  {config.title}
                                </h4>
                                <p className="text-gray-400 text-xs mt-1 leading-tight">
                                  {config.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                        {errors.role && (
                          <p className="text-red-400 text-sm mt-1">
                            {errors.role}
                          </p>
                        )}
                      </div>

                      {selectedRole === USER_ROLES.INSTITUTE && (
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">
                            Institute Name
                          </label>
                          <input
                            type="text"
                            placeholder="Enter your institute name"
                            value={instituteName}
                            onChange={(e) => {
                              setInstituteName(e.target.value);
                              if (errors.instituteName)
                                setErrors({ ...errors, instituteName: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-700/50 text-white placeholder-gray-400 ${
                              errors.instituteName
                                ? "border-red-500/50"
                                : "border-gray-600"
                            }`}
                          />
                          {errors.instituteName && (
                            <p className="text-red-400 text-sm mt-1">
                              {errors.instituteName}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: "" });
                        }}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-700/50 text-white placeholder-gray-400 ${
                          errors.email ? "border-red-500/50" : "border-gray-600"
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password)
                            setErrors({ ...errors, password: "" });
                        }}
                        className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-700/50 text-white placeholder-gray-400 ${
                          errors.password
                            ? "border-red-500/50"
                            : "border-gray-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-sm mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {isLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        {isLogin ? "Sign In" : "Create Account"}
                        <Sparkles className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-800/70 text-gray-400">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="mt-4 w-full bg-gray-700/50 border border-gray-600 text-gray-200 py-3 px-4 rounded-xl font-medium hover:bg-gray-600/50 focus:ring-4 focus:ring-gray-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-gray-300">
                    {isLogin
                      ? "Don't have an account?"
                      : "Already have an account?"}{" "}
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setErrors({});
                        setSelectedRole("");
                        setFullName("");
                        setInstituteName("");
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      {isLogin ? "Sign Up" : "Sign In"}
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Hero Content */}
            <div className="order-1 lg:order-2">
              <div className="text-center lg:text-left mb-12">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                  <h1 className="text-4xl font-bold">Premium Access</h1>
                </div>
                <p className="text-gray-300 text-lg max-w-2xl">
                  Join thousands of professionals who trust our platform for
                  secure attendance management
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid gap-6 mb-8">
                <div className="p-6 bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700/50">
                  <Shield className="w-12 h-12 text-indigo-400 mb-4" />
                  <h3 className="font-semibold text-white mb-2">
                    Enterprise Security
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Bank-level encryption and security protocols to protect your
                    data
                  </p>
                </div>
                <div className="p-6 bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700/50">
                  <Zap className="w-12 h-12 text-purple-400 mb-4" />
                  <h3 className="font-semibold text-white mb-2">
                    Lightning Fast
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Instant sync across all your devices with real-time updates
                  </p>
                </div>
                <div className="p-6 bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700/50">
                  <Sparkles className="w-12 h-12 text-indigo-400 mb-4" />
                  <h3 className="font-semibold text-white mb-2">
                    Role-Based Access
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Customized dashboards and features based on your role and
                    permissions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Reset Password
            </h3>
            <p className="text-gray-300 mb-4">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700/50 text-white placeholder-gray-400"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForgotPassword}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Send Reset Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
