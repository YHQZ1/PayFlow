import { BrowserRouter, Routes, Route } from "react-router-dom";
import PayFlow from "./pages/PayFlow";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PayFlow />} />
      </Routes>
    </BrowserRouter>
  );
}
