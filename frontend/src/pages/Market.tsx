import { useEffect } from "react";
import Charts from "../components/Charts";
import { Header } from "../components/Navbar";
import TogglePanel from "../components/TogglePanel";
import TokenList from "../components/TokenList";
import OrderForm from "../components/Trade";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

function Market() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = Cookies.get("authorization");
    const email = Cookies.get("email");
    if (!token || !email) {
      navigate("/login", { replace: true });
      return;
    }
  }, []);
  return (
    <div className="dark mx-12">
      <Header />
      <div>
        <div className=" flex flex-row gap-8">
          <div className="mt-8">
            <TokenList />
          </div>
          <Charts />
          <div className="mt-8">
            <OrderForm />
          </div>
        </div>
      </div>
      <div className="mt-2">
        <TogglePanel />
      </div>
    </div>
  );
}
export default Market;
