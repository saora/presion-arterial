import "../src/styles/base.css";
import "../src/styles/layout.css";
import "../src/styles/header.css";
import "../src/styles/navigation.css";
import "../src/styles/form.css";
import "../src/styles/chart.css";
import "../src/styles/scan.css";
import "../src/styles/history.css";

import appTemplate from "./app.html?raw";

import { renderHeader } from "../src/components/header/header";
import {
  renderNavigation,
  initializeNavigation,
  showPage,
} from "../src/components/navigation/navigation";

import {
  renderHomePage,
  initializeHomePage,
} from "../src/pages/home/home";

import {
  renderRegisterPage,
  initializeRegisterPage,
} from "../src/pages/register/register";

import {
  renderScanPage,
  initializeScanPage,
  setScanPageActive,
} from "../src/pages/scan/scan";

import {
  renderHistoryPage,
  initializeHistoryPage,
  refreshHistoryPage,
} from "../src/pages/history/history";

export async function initializeApp(): Promise<void> {
  console.log("APP: initializeApp");

  const app = document.getElementById("app");

  if (!app) {
    console.error("APP: #app not found");
    return;
  }

  app.innerHTML = appTemplate
    .replace("{{HEADER}}", renderHeader())
    .replace("{{HOME}}", renderHomePage())
    .replace("{{REGISTER}}", renderRegisterPage())
    .replace("{{SCAN}}", renderScanPage())
    .replace("{{HISTORY}}", renderHistoryPage())
    .replace("{{NAVIGATION}}", renderNavigation());

  initializeHomePage();
  initializeRegisterPage();
  initializeHistoryPage();
  initializeScanPage();
  initializeNavigation((page) => {
    if (page === "history") {
      refreshHistoryPage();
    }

    setScanPageActive(page === "scan");
  });

  showPage("home");
}
