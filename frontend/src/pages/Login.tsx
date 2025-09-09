import { toast } from "sonner";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "../components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password } = formData;
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      const url = isLogin
        ? "http://localhost:3000/api/v1/user/signin"
        : "http://localhost:3000/api/v1/user/signup";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (isLogin) {
        if (data.msg == "success") {
          toast.success("Logged in successfully!", {
            position: "top-center",
            closeButton: true,
          });

          setTimeout(() => {
            window.location.href = "/market";
          }, 2000);
        } else {
          toast.error(data.error || "Login failed", {
            position: "top-center",
            closeButton: true,
          });
        }
      } else {
        if (data.userId) {
          toast.success("Account created! Please login.", {
            position: "top-center",
            closeButton: true,
          });
          setIsLogin(true);
          setFormData({ email: "", password: "" });
        } else {
          toast.error(data.message || "Signup failed", {
            position: "top-center",
            closeButton: true,
          });
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center font-mono p-4">
      <div className="absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center"></div>
      <div className="absolute inset-0 bg-background opacity-60"></div>

      <Card className="relative z-10 w-full max-w-md bg-background border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "LOGIN" : "SIGNUP"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "Access your account" : "Create new account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <label htmlFor="email">EMAIL</label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="p-2 border"
                placeholder="Enter email"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password">PASSWORD</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="p-2 pr-10 border "
                  placeholder="Enter password"
                  required
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent hover:bg-transparent text-foreground p-1 border-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="font-bold py-3 hover:opacity-90 transition-all"
            >
              {isLogin ? "LOGIN" : "CREATE ACCOUNT"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="border-none text-foreground bg-transparent hover:underline hover:bg-transparent"
            >
              {isLogin
                ? "Don't have an account? SIGNUP"
                : "Already have an account? LOGIN"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
