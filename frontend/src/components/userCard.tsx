import { User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useBalance } from "../store/balance";
import { intToDecimal } from "../utils/formatter";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const UserCard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { balance, setBalance } = useBalance();
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("authorization");
    const email = Cookies.get("email");
    if (!token || !email) {
      navigate("/login", { replace: true });
      return;
    }

    setBalance();
  }, [setBalance, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={cardRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center space-x-3 px-2 py-1 rounded-lg hover:bg-gray-800 transition bg-gray-800"
      >
        <span>{intToDecimal(balance.balance, 4, 4)}</span>
        <User className="w-8 h-8 rounded-2xl p-2 bg-black text-white" />
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 text-white rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center space-x-3 mb-3">
            <User className="w-8 h-8 rounded-2xl p-2 bg-black text-white" />
            <div>
              <p className="text-gray-300">{localStorage.getItem("email")}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <div>
              <span>Balance = </span>
              <span>${intToDecimal(balance.balance, 4, 4)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCard;
