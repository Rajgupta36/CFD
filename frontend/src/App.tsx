import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Market from './pages/Market';
import Home from './pages/Home';
import Login from './pages/Login';
import { Toaster } from 'sonner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/market" element={<Market />} />
        <Route path="/login" element={<Login />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
