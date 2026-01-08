"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State for toggling visibility
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(identifier, password);

      if (success) {
        router.push("/dashboard");
      } else {
        setError(
          "Invalid credentials. Please check your Login ID or Password."
        );
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT SIDE: Decorative / Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden">
        {/* Background Overlay with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-slate-900/90 z-10" />

        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
          alt="Logistics Background"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="relative z-20 flex flex-col justify-between p-12 w-full h-full text-white">
          <div className="w-fit bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Indovista Logo"
                width={40}
                height={40}
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span className="font-bold text-xl tracking-wide">INDOVISTA</span>
            </div>
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-4xl font-bold leading-tight">
              Seamless Global Shipping Solutions.
            </h2>
            <p className="text-blue-100 text-lg">
              Manage your fleets, track international shipments, and optimize
              supply chains from a single enterprise dashboard.
            </p>
          </div>

          <div className="text-sm text-blue-200/60">
            © {new Date().getFullYear()} Indovista Logistics. Enterprise Portal.
            Powered by{" "}
            <Link
              href="https://www.outrightcreators.com/"
              className="font-medium text-[#139BC3] hover:underline"
            >
              Outright Creators
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 xl:p-24 bg-gray-50/50">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-blue-50 mb-4">
              <Image
                src="/logo.png"
                alt="Indovista Logo"
                width={64}
                height={64}
                className="mx-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Indovista Logistics
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              International Shipping Portal
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block">
            <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
            <p className="text-slate-500 mt-2">
              Please enter your credentials to access the dashboard.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 lg:bg-transparent lg:p-0 lg:shadow-none lg:border-none"
          >
            {/* Input: Identifier */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                Login ID or Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-50"
                  placeholder="admin@indovista.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* Input: Password (Updated with Eye Icon) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                Password
              </label>
              <div className="relative group">
                {/* Left Icon (Lock) */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>

                <input
                  type={showPassword ? "text" : "password"} // Dynamic type
                  required
                  disabled={isLoading}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {/* Right Icon (Eye Toggle) */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1} // Prevents tabbing to the eye icon before the input
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="text-red-500 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-blue-500/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="pt-6 text-center lg:text-left border-t border-gray-100 lg:border-none">
            <p className="text-xs text-gray-500">
              By accessing this system, you agree to the{" "}
              <a href="#" className="underline hover:text-gray-900">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-gray-900">
                Terms of Service
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
