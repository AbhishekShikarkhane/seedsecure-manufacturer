import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BlockchainProvider } from "./BlockchainContext.jsx";
import "./styles.css";

const Root = import.meta.env.MODE === "production"
  ? <React.StrictMode><BlockchainProvider><App /></BlockchainProvider></React.StrictMode>
  : <BlockchainProvider><App /></BlockchainProvider>;

ReactDOM.createRoot(document.getElementById("root")).render(Root);
