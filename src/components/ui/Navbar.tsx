import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

const Navbar = () => {
  const { isSignedIn, signOut } = useAuth(); // `isSignedIn` checks if the user is logged in
  const [showSignOut, setShowSignOut] = useState(false); // State to toggle the sign-out button
  const [signOutClicked, setSignOutClicked] = useState(false); // State to track the click effect on Sign Out
  const [signInClicked, setSignInClicked] = useState(false); // State to track the click effect on Sign In

  // Toggle the visibility of the sign-out button
  const handleAvatarClick = () => {
    setShowSignOut((prev) => !prev);
  };

  // Handle Sign In button click effect
  const handleSignInClick = () => {
    setSignInClicked(true);
    setTimeout(() => {
      setSignInClicked(false); // Reset after 300ms (or adjust as needed)
    }, 300);
  };

  // Handle Sign Out button click effect
  const handleSignOutClick = () => {
    setSignOutClicked(true);
    setTimeout(() => {
      setSignOutClicked(false); // Reset after 300ms (or adjust as needed)
      signOut(); // Sign out the user after the effect
    }, 300);
  };

  return (
    <nav className="flex items-center justify-between bg-white px-8 py-4 shadow-md">
      {/* Logo Section */}
      <div className="flex items-center space-x-3">
        <Image
          src="/comig-gen.png" // Replace with the actual logo file path
          alt="Comic Gen Logo"
          width={150} // 200% bigger than the original 40px width
          height={150} // 200% bigger than the original 40px height
        />
      </div>

      {/* Centered Navigation Links */}
      <div className="flex items-center absolute left-1/2 transform -translate-x-1/2 space-x-6">
        <Link href="/generation">
          <span
            className="text-lg font-semibold text-gray-1000 hover:text-white hover:bg-orange-500 transition duration-300 px-10 py-1 rounded-lg"
            style={{ position: "relative", left: "500px" }}
          >
            Create
          </span>
        </Link>
        <Link href="/comics-history">
          <span
            className="text-lg font-semibold text-gray-1000 hover:text-white hover:bg-orange-500 transition duration-300 px-10 py-1 rounded-lg"
            style={{ position: "relative", left: "500px" }}
          >
            History
          </span>
        </Link>
      </div>

      {/* User Profile or Sign In */}
      <div className="flex items-center">
        {isSignedIn ? (
          <div className="relative flex items-center space-x-4">
            {/* Avatar */}
            <div
              className="w-10 h-10 bg-orange-500 text-white font-bold rounded-full flex items-center justify-center"
              onClick={handleAvatarClick} // Toggle sign-out button on avatar click
              title="Profile"
              style={{ cursor: "pointer" }}
            >
              E
            </div>

            {/* Conditionally render the Sign Out button below the avatar */}
            {showSignOut && (
              <button
                onClick={handleSignOutClick} // Handle Sign Out click effect
                className={`absolute top-12 bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-md transition duration-300 ${
                  signOutClicked ? "bg-red-800" : ""
                }`}
                style={{ position: "absolute", left: "-30px" }}
              >
                Sign Out
              </button>
            )}
          </div>
        ) : (
          <Link href="/sign-in">
            <span
              className={`text-lg font-semibold text-gray-700 transition duration-300 px-6 py-1 rounded-lg ${
                signInClicked
                  ? "bg-orange-500 text-white"
                  : "hover:text-white hover:bg-orange-1000"
              }`}
              style={{ position: "absolute", left: "-10px" }}
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
