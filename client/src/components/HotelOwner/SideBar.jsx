import React from "react";
import { NavLink } from "react-router-dom";

// Icons
const DashboardIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
);

const AddRoomIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const ListRoomIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </svg>
);

const Sidebar = () => {
  const baseClasses =
    "flex items-center gap-x-4 px-4 py-3 rounded-lg font-medium transition-all duration-200";

  const inactiveClasses =
    "text-gray-600 hover:bg-gray-100";

  const activeClasses =
    "bg-gray-200 text-gray-900 font-semibold shadow-sm";

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      {/* Navigation */}
      <div className="mt-6 flex flex-1 flex-col">
        <nav className="flex-1 space-y-1 px-3">
          <NavLink
            to="/owner"
            end
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            <DashboardIcon className="h-5 w-5" />
            Dashboard
          </NavLink>

          <NavLink
            to="/owner/Addroom"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            <AddRoomIcon className="h-5 w-5" />
            Add Room
          </NavLink>

          <NavLink
            to="/owner/ListRoom"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            <ListRoomIcon className="h-5 w-5" />
            List Room
          </NavLink>
        </nav>
      </div>

      {/* Footer (Logout) */}
      <div className="border-t px-3 py-4">
        <button className="w-full flex items-center gap-x-3 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V5"
            />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
