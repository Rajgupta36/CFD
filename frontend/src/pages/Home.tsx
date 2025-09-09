import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/market');
  }, [navigate]);

  return (
    <div className="h-[100vh] flex justify-center items-center">
      <h1 className="text-foreground font-bold text-6xl">
        Welcome to the Home Page
      </h1>
      <p>redirecting to the marketplace...</p>
    </div>
  );
}
