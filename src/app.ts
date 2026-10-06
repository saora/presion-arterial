import './styles/base.css';
import './styles/leyout.css';
import './styles/header.css';
import './styles/navigation.css';
import './styles/form.css';
import './styles/scan.css';
import './styles/history.css';

import { renderHeader } from './components/header';
import {
  renderNavigation,
  initializeNavigation
} from './components/navigation';

import {
  renderRegisterPage,
  initializeRegisterPage
} from './pages/register';

import {
  renderScanPage,
  initializeScanPage
} from './pages/scan';
import {
  renderHistoryPage,
  initializeHistoryPage
} from './pages/history';


export function initializeApp(): void {

  console.log(
    'APP: initializeApp'
  );


  const app =
    document.getElementById('app');


  if (!app) {

    console.error(
      'APP: #app not found'
    );

    return;
  }


  app.innerHTML = `
    <div class="app">

      ${renderHeader()}


      <main class="app-content">

        ${renderRegisterPage()}

        ${renderScanPage()}

        ${renderHistoryPage()}

      </main>


      ${renderNavigation()}

    </div>
  `;

initializeRegisterPage();
initializeHistoryPage();
initializeScanPage();
initializeNavigation();
}