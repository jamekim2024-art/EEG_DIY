import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes, Link } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { DatasetPage, ResearchPage } from "./pages/ExtraPages";
import { ModelPage } from "./pages/ModelPage";
import "./styles.css";

function App() {
  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav-brand">
          Neuro
        </Link>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          Dashboard
        </NavLink>
        <NavLink to="/dataset" className={({ isActive }) => (isActive ? "active" : undefined)}>
          Dataset
        </NavLink>
        <NavLink to="/model" className={({ isActive }) => (isActive ? "active" : undefined)}>
          Model
        </NavLink>
        <NavLink to="/research" className={({ isActive }) => (isActive ? "active" : undefined)}>
          Research
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dataset" element={<DatasetPage />} />
        <Route path="/model" element={<ModelPage />} />
        <Route path="/research" element={<ResearchPage />} />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
