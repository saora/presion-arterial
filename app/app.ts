import "../src/styles/base.css";
import "../src/styles/layout.css";
import "../src/styles/header.css";
import "../src/styles/navigation.css";
import "../src/styles/form.css";
import "../src/styles/scan.css";
import "../src/styles/history.css";

import appTemplate from "./app.html?raw";

import { renderHeader } from "../src/components/header/header";
import {
  renderNavigation,
  initializeNavigation,
} from "../src/components/navigation/navigation";

import {
  renderRegisterPage,
  initializeRegisterPage,
} from "../src/pages/register/register";

import { renderScanPage, initializeScanPage } from "../src/pages/scan/scan";

import {
  renderHistoryPage,
  initializeHistoryPage,
  refreshHistoryPage,
} from "../src/pages/history/history";

export function initializeApp(): void {
  console.log("APP: initializeApp");

  const app = document.getElementById("app");

  if (!app) {
    console.error("APP: #app not found");
    return;
  }

  app.innerHTML = appTemplate
    .replace("{{HEADER}}", renderHeader())
    .replace("{{REGISTER}}", renderRegisterPage())
    .replace("{{SCAN}}", renderScanPage())
    .replace("{{HISTORY}}", renderHistoryPage())
    .replace("{{NAVIGATION}}", renderNavigation());

  initializeRegisterPage();
  initializeHistoryPage();
  initializeScanPage();
  initializeNavigation((page) => {
    if (page === "history") {
      refreshHistoryPage();
    }
  });
}
