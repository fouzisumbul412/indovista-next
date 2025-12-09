"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Topbar = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout, user } = useAuth();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // @ts-ignore
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="
        h-16 bg-white border-b border-gray-200 fixed top-0 right-0 
        md:left-64          /* desktop */
        left-0              /* mobile */
        transition-all
        z-10 flex items-center justify-end px-8
      "
    >
      {/* Profile Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role || "Authenticated"}
            </p>
          </div>

          <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <User className="w-5 h-5" />
          </div>

          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border border-gray-200 py-2">
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
