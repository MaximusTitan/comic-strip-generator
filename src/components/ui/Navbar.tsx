"use client"

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { useRouter } from 'next/navigation';

const Navbar = ({ style }: { style?: React.CSSProperties }) => {
  const { isSignedIn, signOut } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);
  const [signOutClicked, setSignOutClicked] = useState(false);
  const [signInClicked, setSignInClicked] = useState(false);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAvatarClick = () => {
    setShowSignOut((prev) => !prev);
  };

  const handleSignInClick = () => {
    setSignInClicked(true);
    setTimeout(() => {
      setSignInClicked(false);
    }, 300);
  };

  const handleSignOutClick = () => {
    setSignOutClicked(true);
    setTimeout(() => {
      setSignOutClicked(false);
      signOut();
    }, 300);
  };

  const handleLogoClick = () => {
    if (isClient) {
      router.push('/');
    }
  };

  const history_visit = () => {
    if (isClient) {
      router.push('/comics-history');
    }
  };

  return (
    <nav className="flex items-center justify-between bg-white px-8 py-4" style={style}>
      {/* Logo Section */}
      <div className="flex items-center space-x-3 pl-10" onClick={handleLogoClick}>
        <Image
          src="/comic-gen.png"
          alt="Comic Gen Logo"
          width={100}
          height={100}
          className="ml-36 pt-10"
        />
      </div>

      {/* Right-Aligned Navigation and User Profile */}
      <div className="flex items-center space-x-8" onClick={history_visit}>

        {/* History Button */}
          <span className="text-lg font-semibold text-gray-1000 transition duration-300 px-4 py-1 rounded-lg">
            History
          </span>

        {/* User Profile or Sign In */}
        {isSignedIn ? (
          <div className="relative flex items-center">
            <div
              className="w-10 h-10 bg-orange-500 text-white font-bold rounded-full flex items-center justify-center cursor-pointer"
              onClick={handleAvatarClick}
              title="Profile"
            >
              <i className="fas fa-user"></i>
            </div>
            {showSignOut && (
              <button
                onClick={handleSignOutClick}
                className={`absolute top-12 bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition duration-300 ${signOutClicked ? "bg-red-800" : ""}`}
              >
                Sign Out
              </button>
            )}
          </div>
        ) : (
          <Link href="/auth/sign-in">
            <span
              className={`text-lg font-semibold text-gray-700 hover:text-white hover:bg-orange-500 transition duration-300 px-6 py-2 rounded-lg ${
                signInClicked ? "bg-orange-500 text-white" : ""
              }`}
              onClick={handleSignInClick}
            >
              Sign In
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
